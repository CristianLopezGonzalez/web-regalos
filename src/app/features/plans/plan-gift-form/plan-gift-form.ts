import {
  Component,
  OnDestroy,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  FormField,
  FormRoot,
  form,
  max,
  maxLength,
  min,
  required,
  validate,
} from '@angular/forms/signals';
import { errorMessage } from '@app/core/api/error-message';
import { formatPrice } from '@app/core/format/price-format';
import { checkImageFile, resizeImage } from '@app/core/image/image-resize';
import { CURRENCIES, Currency } from '@app/core/models/gift';
import {
  PLAN_STATUSES,
  PLAN_STATUS_LABEL,
  PlanGift,
  PlanStatus,
  Planner,
} from '@app/core/models/plan';
import { LabeledField } from '@app/design-system/forms/labeled-field/labeled-field';
import { httpsUrl } from '@app/design-system/forms/validators';
import { ProductImage } from '@app/design-system/gift/product-image/product-image';
import { SplitPreset, round2, sharesMatch } from '../plan-math';
import { PlansStore } from '../plans-store';
import {
  PaidByChoice,
  emptyPlanGiftForm,
  formShares,
  formToPlanInput,
  planGiftToForm,
} from './plan-gift-form-model';

const CURRENCY_SYMBOL: Record<Currency, string> = { EUR: '€', USD: '$', GBP: '£' };

/**
 * Create / edit a present we plan to give: what it is, how much each of us puts in and who paid
 * at the shop. The photo is resized in the browser (480/960/1600, WebP or JPEG on Safari).
 */
@Component({
  selector: 'app-plan-gift-form',
  imports: [FormField, FormRoot, LabeledField, ProductImage],
  host: { class: 'block' },
  templateUrl: './plan-gift-form.html',
  styleUrl: './plan-gift-form.css',
})
export class PlanGiftForm implements OnDestroy {
  private readonly store = inject(PlansStore);

  readonly gift = input<PlanGift | null>(null);
  readonly personId = input.required<string>();
  /** The signed-in planner. */
  readonly me = input.required<string>();
  /** The other planner (Ángela for Cristian). */
  readonly other = input.required<Planner>();

  readonly saved = output<PlanGift>();

  protected readonly currencies = CURRENCIES;
  protected readonly statuses = PLAN_STATUSES;
  protected readonly statusLabel = PLAN_STATUS_LABEL;

  protected readonly form = form(
    signal(emptyPlanGiftForm()),
    (p) => {
      required(p.name, { message: 'Ponle un nombre al regalo.' });
      maxLength(p.name, 120, { message: 'Usa como mucho 120 caracteres.' });
      required(p.price, { message: 'Escribe el precio (0 si aún no lo sabes).' });
      min(p.price, 0, { message: 'El precio no puede ser negativo.' });
      max(p.price, 99999999, { message: 'Revisa el precio: es demasiado alto.' });
      maxLength(p.note, 2000, { message: 'Usa como mucho 2000 caracteres.' });
      httpsUrl(p.purchaseUrl);
      // "Otra cantidad": what the other one puts must fit in the price; the rest is mine.
      validate(p.otherAmount, ({ value, valueOf }) => {
        if (valueOf(p.preset) !== 'custom') return undefined;
        const amount = value();
        if (amount === null || Number.isNaN(amount))
          return { kind: 'required', message: `Escribe cuánto pone ${this.other().name}.` };
        if (amount < 0) return { kind: 'shares', message: 'La cantidad no puede ser negativa.' };
        const model = {
          ...emptyPlanGiftForm(),
          preset: 'custom' as const,
          otherAmount: amount,
          price: valueOf(p.price),
        };
        return sharesMatch(formShares(model, this.me(), this.other().id), valueOf(p.price) ?? 0)
          ? undefined
          : { kind: 'shares', message: `${this.other().name} no puede poner más que el precio.` };
      });
    },
    {
      submission: {
        action: () => this.save(),
        onInvalid: (f) => f().errorSummary()[0]?.fieldTree().focusBoundControl(),
      },
    },
  );

  /** The live split, as the summary line under the amounts shows it. */
  protected readonly shares = computed(() =>
    formShares(this.form().value(), this.me(), this.other().id),
  );
  protected readonly myShare = computed(() => this.shares()[this.me()] ?? 0);
  protected readonly otherShare = computed(() => this.shares()[this.other().id] ?? 0);
  protected readonly sharesOk = computed(() =>
    sharesMatch(this.shares(), this.form.price().value() ?? 0),
  );
  /** "30 € + 55 € = 85 €" */
  protected readonly sumLine = computed(() => {
    const price = round2(this.form.price().value() ?? 0);
    const a = this.money(this.otherShare());
    const b = this.money(this.myShare());
    return this.sharesOk()
      ? `${a} + ${b} = ${this.money(price)}, el precio completo`
      : `${a} + ${b} no suma ${this.money(price)}`;
  });
  protected readonly symbol = computed(() => CURRENCY_SYMBOL[this.form.currency().value()]);

  protected readonly presets = computed<{ value: SplitPreset; label: string }[]>(() => [
    { value: 'half', label: 'A medias' },
    { value: 'me', label: 'Todo yo' },
    { value: 'other', label: `Todo ${this.other().name}` },
    { value: 'custom', label: 'Otra cantidad' },
  ]);
  protected readonly payers = computed<{ value: PaidByChoice; label: string }[]>(() => [
    { value: 'me', label: 'Yo' },
    { value: 'other', label: this.other().name },
    { value: 'none', label: 'Aún nadie' },
  ]);
  protected readonly payerHint = computed(() => {
    const paid = this.form.paidBy().value();
    if (paid === 'none')
      return 'Cuando alguien lo pague, la app os dirá quién le debe cuánto a quién.';
    if (paid === 'me')
      return this.otherShare() > 0
        ? `Así, ${this.other().name} te debe ${this.money(this.otherShare())} por este regalo.`
        : 'Lo pagas todo tú: no hay nada que devolver.';
    return this.myShare() > 0
      ? `Así, le debes ${this.money(this.myShare())} a ${this.other().name} por este regalo.`
      : `Lo paga todo ${this.other().name}: no hay nada que devolver.`;
  });

  protected readonly failure = signal<string | null>(null);
  protected readonly processing = signal(false);
  protected readonly imageError = signal<string | null>(null);
  protected readonly imageNote = signal<string | null>(null);
  /** null = unchanged, 'remove' = delete, Blob[] = new photo */
  private readonly newImage = signal<Blob[] | 'remove' | null>(null);
  private readonly objectUrl = signal<string | null>(null);

  protected readonly preview = computed(() => {
    const url = this.objectUrl();
    if (url) return { sm: url, md: url, lg: url };
    return this.newImage() === 'remove' ? null : (this.gift()?.image ?? null);
  });

  constructor() {
    // Editing: load the gift (again after each save) and start untouched.
    effect(() => {
      const g = this.gift();
      if (g) this.form().reset(planGiftToForm(g, this.me(), this.other().id));
    });
  }

  protected money(n: number) {
    return formatPrice(n, this.form.currency().value());
  }

  protected setPreset(preset: SplitPreset) {
    // Switching to "Otra cantidad" starts from the current split, not from empty.
    if (preset === 'custom') this.form.otherAmount().value.set(this.otherShare());
    this.form.preset().value.set(preset);
  }

  protected setPaidBy(value: PaidByChoice) {
    this.form.paidBy().value.set(value);
  }

  protected setStatus(value: PlanStatus) {
    this.form.status().value.set(value);
  }

  protected async pick(e: Event) {
    const inputEl = e.target as HTMLInputElement;
    const file = inputEl.files?.[0];
    inputEl.value = '';
    if (!file) return;
    this.imageError.set(null);
    this.imageNote.set(null);
    const check = checkImageFile(file);
    if (!check.ok) return this.imageError.set(check.message);
    this.processing.set(true);
    try {
      const { blobs, width, height, small } = await resizeImage(file);
      if (small) {
        this.imageNote.set(
          `Foto pequeña (${width}×${height} px): en el móvil se verá bien; en pantallas grandes, algo menos nítida.`,
        );
      }
      this.newImage.set(blobs);
      this.setObjectUrl(URL.createObjectURL(blobs[1] ?? blobs[0]));
    } catch (err) {
      this.imageError.set(err instanceof Error ? err.message : 'No se pudo leer la foto.');
    } finally {
      this.processing.set(false);
    }
  }

  protected clearImage() {
    this.imageNote.set(null);
    this.setObjectUrl(null);
    this.newImage.set(this.gift()?.image ? 'remove' : null);
  }

  private setObjectUrl(url: string | null) {
    const old = this.objectUrl();
    if (old) URL.revokeObjectURL(old);
    this.objectUrl.set(url);
  }

  private async save() {
    this.failure.set(null);
    const input = formToPlanInput(this.form().value(), this.personId(), this.me(), this.other().id);
    try {
      const g = this.gift();
      const img = this.newImage();
      const result = await this.store.saveGift(
        g?.id ?? null,
        input,
        g ? img : img === 'remove' ? null : img,
      );
      this.newImage.set(null);
      this.setObjectUrl(null);
      this.saved.emit(result);
    } catch (e) {
      this.failure.set(errorMessage(e));
    }
  }

  ngOnDestroy() {
    this.setObjectUrl(null);
  }
}
