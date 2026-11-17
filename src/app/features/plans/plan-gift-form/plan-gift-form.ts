import {
  Component,
  OnDestroy,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  output,
  signal,
  untracked,
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
 * Create / edit a present we plan to give: for whom, what it is, how much each of us puts in
 * (two amounts you type, always adding up to the price) and who paid at the shop.
 * The photo is resized in the browser (480/960/1600, WebP or JPEG on Safari).
 * Lives inside a dialog: the footer (Cancelar + submit) is part of the form.
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
  /** Who the new present is for (preselected); the person can still be changed in the form. */
  readonly personId = input<string | null>(null);
  /** The signed-in planner. */
  readonly me = input.required<string>();
  /** The other planner (Ángela for Cristian). */
  readonly other = input.required<Planner>();

  readonly saved = output<PlanGift>();
  readonly cancel = output<void>();

  protected readonly people = computed(() => this.store.people() ?? []);
  /** For whom: the gift's person when editing, else the preselected one, else the first. */
  protected readonly chosenPerson = linkedSignal(
    () => this.gift()?.personId ?? this.personId() ?? this.people()[0]?.id ?? '',
  );
  protected readonly chosenInitial = computed(() => {
    const p = this.people().find((x) => x.id === this.chosenPerson());
    return p ? p.name.trim().charAt(0).toLocaleUpperCase('es') : '·';
  });

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
  protected readonly symbol = computed(() => CURRENCY_SYMBOL[this.form.currency().value()]);

  protected readonly presets = computed<{ value: SplitPreset; label: string }[]>(() => [
    { value: 'half', label: 'A medias' },
    { value: 'me', label: 'Todo yo' },
    { value: 'other', label: `Todo ${this.other().name}` },
  ]);
  protected readonly payers = computed<{ value: PaidByChoice; label: string }[]>(() => [
    { value: 'me', label: 'Tú' },
    { value: 'other', label: this.other().name },
  ]);
  protected readonly meInitial = computed(() =>
    this.initial(this.store.planners().find((p) => p.id === this.me())?.name ?? 'Tú'),
  );
  protected readonly otherInitial = computed(() => this.initial(this.other().name));
  /** Why a typed split doesn't work (it always adds up, so only "more than the price" is left). */
  protected readonly splitError = computed(() =>
    this.myShare() < 0
      ? 'No puedes poner más que el precio.'
      : `${this.other().name} no puede poner más que el precio.`,
  );
  /** Link and note: open on phones only when there is something in them. */
  protected readonly moreOpen = linkedSignal(
    () => !!(this.gift()?.purchaseUrl || this.gift()?.note),
  );

  /** Who paid only makes sense once it has been bought. */
  protected readonly payerEnabled = computed(() => this.form.status().value() !== 'idea');

  /** What is being typed in an amount box (so formatting doesn't fight the caret). */
  protected readonly drafts = signal<{ mine?: string; other?: string }>({});
  /** In a typed split, what YOU put stays put when the price changes; the other gets the rest. */
  private readonly myFixed = signal<number | null>(null);
  protected readonly mineText = computed(() => this.drafts().mine ?? this.plain(this.myShare()));
  protected readonly otherText = computed(
    () => this.drafts().other ?? this.plain(this.otherShare()),
  );
  /** Width of your part on the two-colour bar. */
  protected readonly myPct = computed(() => {
    const price = this.form.price().value() ?? 0;
    if (!(price > 0)) return 50;
    return Math.min(100, Math.max(0, Math.round((this.myShare() / price) * 100)));
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
      if (!g) return;
      untracked(() => {
        const v = planGiftToForm(g, this.me(), this.other().id);
        this.form().reset(v);
        this.myFixed.set(v.preset === 'custom' ? (g.shares[this.me()] ?? 0) : null);
        this.drafts.set({});
      });
    });
    // A typed split keeps YOUR part when the price changes (capped at the price).
    effect(() => {
      const price = round2(this.form.price().value() ?? 0);
      untracked(() => {
        const mine = this.myFixed();
        if (this.form.preset().value() !== 'custom' || mine === null) return;
        const other = round2(Math.max(0, price - Math.min(mine, price)));
        if (this.form.otherAmount().value() !== other) this.form.otherAmount().value.set(other);
      });
    });
  }

  private initial(name: string) {
    return name.trim().charAt(0).toLocaleUpperCase('es') || '·';
  }

  /** 27.5 -> "27,5" (what goes in an amount box). */
  private plain(n: number) {
    return String(round2(n)).replace('.', ',');
  }

  private parseAmount(text: string) {
    const n = parseFloat(text.replace(/\s/g, '').replace(',', '.'));
    return Number.isFinite(n) ? round2(n) : 0;
  }

  /** Typing what YOU put: the other one puts the rest of the price. */
  protected typeMine(text: string) {
    this.drafts.set({ mine: text });
    const price = round2(this.form.price().value() ?? 0);
    const mine = this.parseAmount(text);
    this.myFixed.set(mine);
    this.form.preset().value.set('custom');
    this.form.otherAmount().value.set(round2(price - mine));
    this.form.otherAmount().markAsTouched();
  }

  /** Typing what the OTHER puts: you put the rest of the price. */
  protected typeOther(text: string) {
    this.drafts.set({ other: text });
    const price = round2(this.form.price().value() ?? 0);
    const other = this.parseAmount(text);
    this.myFixed.set(round2(price - other));
    this.form.preset().value.set('custom');
    this.form.otherAmount().value.set(other);
    this.form.otherAmount().markAsTouched();
  }

  protected endTyping() {
    this.drafts.set({});
  }

  protected money(n: number) {
    return formatPrice(n, this.form.currency().value());
  }

  protected setPreset(preset: SplitPreset) {
    this.myFixed.set(null);
    this.drafts.set({});
    this.form.preset().value.set(preset);
  }

  protected setPaidBy(value: PaidByChoice) {
    this.form.paidBy().value.set(value);
  }

  /** Bought or wrapped: someone paid (you, unless you say otherwise). An idea: nobody yet. */
  protected setStatus(value: PlanStatus) {
    this.form.status().value.set(value);
    if (value === 'idea') this.form.paidBy().value.set('none');
    else if (this.form.paidBy().value() === 'none') this.form.paidBy().value.set('me');
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
    const input = formToPlanInput(
      this.form().value(),
      this.chosenPerson(),
      this.me(),
      this.other().id,
    );
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
