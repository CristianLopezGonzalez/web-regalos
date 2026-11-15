import { ChangeDetectionStrategy, Component, OnDestroy, computed, effect, inject, input, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { errorMessage } from '../../core/format';
import { checkImageFile, resizeImage } from '../../core/image-resize';
import { CURRENCIES, Category, Gift, GiftInput, PRIORITY_LABEL, Priority } from '../../core/models';
import { WishlistApi } from '../../core/wishlist-api';
import { ProductImage } from '../gift/product-image';
import { FormField } from './form-field';
import { errorFor, httpsUrl } from './form-utils';

/** Create / edit a gift. The photo is resized in the browser to 480, 960 and 1600 px WebP. */
@Component({
  selector: 'app-admin-gift-form',
  imports: [ReactiveFormsModule, FormField, ProductImage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <form class="agf" [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <div class="agf-photo">
        <p class="field-label" id="agf-photo-label">Fotografía</p>
        <app-product-image class="agf-preview" [image]="preview()" [alt]="form.controls.name.value || 'Nuevo regalo'" sizes="320px" />
        <div class="agf-photo-actions">
          <label class="btn btn-outline btn-sm" [class.opacity-50]="processing()">
            <input class="sr-only" type="file" accept="image/jpeg,image/png,image/webp" (change)="pick($event)" [disabled]="processing()" aria-labelledby="agf-photo-label" aria-describedby="agf-photo-msg" />
            {{ processing() ? 'Preparando la foto…' : preview() ? 'Cambiar foto' : 'Elegir foto' }}
          </label>
          @if (preview()) {
            <button type="button" class="btn btn-ghost" (click)="clearImage()">Quitar</button>
          }
        </div>
        @if (imageError()) {
          <p class="field-error" id="agf-photo-msg" role="alert">{{ imageError() }}</p>
        } @else if (imageNote()) {
          <p class="field-hint" id="agf-photo-msg" role="status">{{ imageNote() }}</p>
        } @else {
          <p class="field-hint" id="agf-photo-msg">JPG, PNG o WebP. Se ve más nítida a partir de 800 px, mejor sobre fondo claro y liso.</p>
        }
      </div>

      <div class="agf-fields">
        <app-form-field label="Nombre" forId="agf-name" [error]="err('name')">
          <input id="agf-name" class="input" formControlName="name" maxlength="120" aria-describedby="agf-name-msg" [attr.aria-invalid]="!!err('name')" />
        </app-form-field>

        <app-form-field label="Descripción" forId="agf-desc" [optional]="true" hint="Una o dos frases: por qué lo quieres, talla, color…" [error]="err('description')">
          <textarea id="agf-desc" class="input" formControlName="description" maxlength="2000" aria-describedby="agf-desc-msg"></textarea>
        </app-form-field>

        <div class="grid grid-cols-[1fr_8rem] gap-4">
          <app-form-field label="Precio" forId="agf-price" [error]="err('price')">
            <input id="agf-price" class="input tabular" type="number" inputmode="decimal" min="0" step="0.01" formControlName="price" aria-describedby="agf-price-msg" [attr.aria-invalid]="!!err('price')" />
          </app-form-field>
          <app-form-field label="Moneda" forId="agf-currency">
            <select id="agf-currency" class="input" formControlName="currency">
              @for (c of currencies; track c) {
                <option [value]="c">{{ c }}</option>
              }
            </select>
          </app-form-field>
        </div>

        <app-form-field label="Enlace de compra" forId="agf-url" [optional]="true" hint="La página de la tienda, empezando por https://" [error]="err('purchaseUrl')">
          <input id="agf-url" class="input" type="url" inputmode="url" spellcheck="false" formControlName="purchaseUrl" placeholder="https://" aria-describedby="agf-url-msg" [attr.aria-invalid]="!!err('purchaseUrl')" />
        </app-form-field>

        <div class="grid gap-4 sm:grid-cols-2">
          <app-form-field label="Categoría" forId="agf-cat">
            <select id="agf-cat" class="input" formControlName="categoryId">
              <option value="">Sin categoría</option>
              @for (c of categories(); track c.id) {
                <option [value]="c.id">{{ c.name }}</option>
              }
            </select>
          </app-form-field>
          <app-form-field label="Prioridad" forId="agf-priority">
            <select id="agf-priority" class="input" formControlName="priority">
              @for (p of priorities; track p) {
                <option [value]="p">{{ priorityLabel[p] }}</option>
              }
            </select>
          </app-form-field>
        </div>

        <label class="check">
          <input type="checkbox" formControlName="isFavorite" />
          <span>Favorito: aparece en el escaparate de la home</span>
        </label>

        @if (failure()) {
          <p class="form-alert" role="alert">{{ failure() }}</p>
        }

        <div class="flex flex-wrap items-center gap-4 pt-2">
          <button type="submit" class="btn btn-primary" [disabled]="busy() || processing()" [attr.aria-busy]="busy()">
            {{ busy() ? 'Guardando…' : gift() ? 'Guardar cambios' : 'Añadir a la wishlist' }}
          </button>
          <ng-content />
        </div>
      </div>
    </form>
  `,
  styles: `
    .agf {
      display: grid;
      gap: 48px;
    }
    @media (min-width: 900px) {
      .agf {
        grid-template-columns: 300px minmax(0, 1fr);
        gap: 64px;
        align-items: start;
      }
      .agf-photo {
        position: sticky;
        top: 112px;
      }
    }
    .agf-photo {
      display: grid;
      gap: 16px;
      align-content: start;
    }
    .agf-preview {
      width: min(100%, 300px);
      aspect-ratio: 3 / 4;
      outline: 1px solid var(--color-gold);
      outline-offset: 6px;
      margin: 6px 6px 8px;
    }
    .agf-photo-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: center;
    }
    .agf-photo-actions label {
      cursor: pointer;
    }
    .agf-photo-actions label:focus-within {
      outline: 2px solid var(--color-cherry);
      outline-offset: 3px;
    }
    .agf-fields {
      display: grid;
      gap: 28px;
      max-width: 640px;
    }
  `,
})
export class AdminGiftForm implements OnDestroy {
  readonly gift = input<Gift | null>(null);
  readonly categories = input<Category[]>([]);
  readonly saved = output<Gift>();

  private readonly api = inject(WishlistApi);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly currencies = CURRENCIES;
  readonly priorities: Priority[] = ['high', 'medium', 'low'];
  readonly priorityLabel = PRIORITY_LABEL;

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    description: ['', Validators.maxLength(2000)],
    price: this.fb.control<number | null>(null, [Validators.required, Validators.min(0), Validators.max(99999999)]),
    currency: this.fb.control<GiftInput['currency']>('EUR'),
    purchaseUrl: ['', httpsUrl],
    categoryId: [''],
    priority: this.fb.control<Priority>('medium'),
    isFavorite: [false],
  });

  readonly busy = signal(false);
  readonly submitted = signal(false);
  readonly failure = signal<string | null>(null);
  readonly processing = signal(false);
  readonly imageError = signal<string | null>(null);
  readonly imageNote = signal<string | null>(null);
  /** null = unchanged, 'remove' = delete, Blob[] = new photo */
  private readonly newImage = signal<Blob[] | 'remove' | null>(null);
  private readonly objectUrl = signal<string | null>(null);

  readonly preview = computed(() => {
    const url = this.objectUrl();
    if (url) return { sm: url, md: url, lg: url };
    return this.newImage() === 'remove' ? null : (this.gift()?.image ?? null);
  });

  constructor() {
    effect(() => {
      const g = this.gift();
      if (!g) return;
      this.form.reset({
        name: g.name,
        description: g.description,
        price: g.price,
        currency: g.currency,
        purchaseUrl: g.purchaseUrl ?? '',
        categoryId: g.categoryId ?? '',
        priority: g.priority,
        isFavorite: g.isFavorite,
      });
    });
  }

  err(name: 'name' | 'description' | 'price' | 'purchaseUrl') {
    return errorFor(this.form.controls[name], this.submitted(), {
      required: name === 'price' ? 'Escribe el precio (0 si no lo sabes).' : 'Ponle un nombre al regalo.',
      maxlength: name === 'name' ? 'Usa como mucho 120 caracteres.' : 'Usa como mucho 2000 caracteres.',
      min: 'El precio no puede ser negativo.',
      max: 'Revisa el precio: es demasiado alto.',
      https: 'Pega el enlace completo, empezando por https://',
    });
  }

  async pick(e: Event) {
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
        this.imageNote.set(`Foto pequeña (${width}×${height} px): en el móvil se verá bien; en pantallas grandes, algo menos nítida.`);
      }
      this.newImage.set(blobs);
      this.setObjectUrl(URL.createObjectURL(blobs[1]));
    } catch (err) {
      this.imageError.set(err instanceof Error ? err.message : 'No se pudo leer la foto.');
    } finally {
      this.processing.set(false);
    }
  }

  clearImage() {
    this.imageNote.set(null);
    this.setObjectUrl(null);
    this.newImage.set(this.gift()?.image ? 'remove' : null);
  }

  private setObjectUrl(url: string | null) {
    const old = this.objectUrl();
    if (old) URL.revokeObjectURL(old);
    this.objectUrl.set(url);
  }

  async submit() {
    this.submitted.set(true);
    this.failure.set(null);
    if (this.form.invalid) {
      setTimeout(() => document.querySelector<HTMLElement>('.agf [aria-invalid="true"]')?.focus());
      return;
    }
    const v = this.form.getRawValue();
    const input: GiftInput = {
      name: v.name.trim(),
      description: v.description.trim(),
      price: Math.round((v.price ?? 0) * 100) / 100,
      currency: v.currency,
      purchaseUrl: v.purchaseUrl.trim() || null,
      categoryId: v.categoryId || null,
      priority: v.priority,
      isFavorite: v.isFavorite,
    };
    this.busy.set(true);
    try {
      const g = this.gift();
      const img = this.newImage();
      const result = g
        ? await this.api.updateGift(g.id, input, img)
        : await this.api.createGift(input, img === 'remove' ? null : img);
      this.newImage.set(null);
      this.setObjectUrl(null);
      this.saved.emit(result);
    } catch (e) {
      this.failure.set(errorMessage(e));
    } finally {
      this.busy.set(false);
    }
  }

  ngOnDestroy() {
    this.setObjectUrl(null);
  }
}
