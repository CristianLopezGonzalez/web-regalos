import {
  Component,
  OnDestroy,
  computed,
  effect,
  inject,
  untracked,
  input,
  output,
  signal,
} from '@angular/core';
import {
  FormField,
  FormRoot,
  applyEach,
  form,
  max,
  maxLength,
  min,
  required,
} from '@angular/forms/signals';
import { errorMessage } from '@app/core/api/error-message';
import { WishlistApi } from '@app/core/api/wishlist-api';
import { checkImageFile, resizeImage } from '@app/core/image/image-resize';
import { Category } from '@app/core/models/category';
import { CURRENCIES, Gift, PRIORITY_LABEL, Priority } from '@app/core/models/gift';
import { LabeledField } from '@app/design-system/forms/labeled-field/labeled-field';
import { ExtraLinksField } from '@app/design-system/forms/extra-links-field/extra-links-field';
import { httpsUrl } from '@app/design-system/forms/validators';
import { ProductImage } from '@app/design-system/gift/product-image/product-image';
import { emptyGiftForm, formToGiftInput, giftToForm } from './gift-form-model';

/** Create / edit a gift. The photo is resized in the browser to 480, 960 and 1600 px WebP. */
@Component({
  selector: 'app-admin-gift-form',
  imports: [FormField, FormRoot, LabeledField, ProductImage, ExtraLinksField],
  host: { class: 'block' },
  templateUrl: './admin-gift-form.html',
  styleUrl: './admin-gift-form.css',
})
export class AdminGiftForm implements OnDestroy {
  private readonly api = inject(WishlistApi);

  readonly gift = input<Gift | null>(null);
  readonly categories = input<Category[]>([]);

  readonly saved = output<Gift>();

  protected readonly currencies = CURRENCIES;
  protected readonly priorities: Priority[] = ['high', 'medium', 'low'];
  protected readonly priorityLabel = PRIORITY_LABEL;

  protected readonly form = form(
    signal(emptyGiftForm()),
    (p) => {
      required(p.name, { message: 'Ponle un nombre al regalo.' });
      maxLength(p.name, 120, { message: 'Usa como mucho 120 caracteres.' });
      maxLength(p.description, 2000, { message: 'Usa como mucho 2000 caracteres.' });
      required(p.price, { message: 'Escribe el precio (0 si no lo sabes).' });
      min(p.price, 0, { message: 'El precio no puede ser negativo.' });
      max(p.price, 99999999, { message: 'Revisa el precio: es demasiado alto.' });
      httpsUrl(p.purchaseUrl);
      applyEach(p.extraUrls, (u) => httpsUrl(u));
    },
    {
      submission: {
        action: () => this.save(),
        // Take the person to the first field that needs fixing.
        onInvalid: (f) => f().errorSummary()[0]?.fieldTree().focusBoundControl(),
      },
    },
  );

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
    // Editing: load the gift (again after each save) and start untouched. Another gift (or none)
    // also drops a photo picked but not saved, so it can never land on the wrong gift.
    let shownId: string | null = null;
    effect(() => {
      const g = this.gift();
      if (g) this.form().reset(giftToForm(g));
      const id = g?.id ?? null;
      if (id !== shownId) {
        shownId = id;
        untracked(() => {
          this.newImage.set(null);
          this.setObjectUrl(null);
          this.imageNote.set(null);
          this.imageError.set(null);
        });
      }
    });
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
      this.setObjectUrl(URL.createObjectURL(blobs[1]));
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
    const input = formToGiftInput(this.form().value());
    try {
      const g = this.gift();
      const img = this.newImage();
      const result = g
        ? await this.api.updateGift(g.id, input, img)
        : await this.api.createGift(input, img === 'remove' ? null : img);
      this.newImage.set(null);
      this.setObjectUrl(null);
      this.imageNote.set(null);
      if (!g) {
        // A new gift: blank form, ready for the next one.
        this.form().reset(emptyGiftForm());
        this.form.name().focusBoundControl();
        scrollTo({ top: 0, behavior: 'smooth' });
      }
      this.saved.emit(result);
    } catch (e) {
      this.failure.set(errorMessage(e));
    }
  }

  ngOnDestroy() {
    this.setObjectUrl(null);
  }
}
