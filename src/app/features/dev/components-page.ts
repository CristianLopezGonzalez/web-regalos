import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DEMO_CATEGORIES } from '../../core/demo-data';
import { Gift } from '../../core/models';
import { Toasts } from '../../core/toast';
import { AdminSidebar } from '../../design-system/admin/admin-sidebar';
import { Modal } from '../../design-system/feedback/modal';
import { FormField } from '../../design-system/forms/form-field';
import { CategoryFilter } from '../../design-system/gift/category-filter';
import { GiftGrid } from '../../design-system/gift/gift-grid';
import { PriceLabel } from '../../design-system/gift/price-label';
import { ProductImage } from '../../design-system/gift/product-image';
import { ReservationBadge } from '../../design-system/gift/reservation-badge';
import { Hero } from '../../design-system/hero/hero';

const sample = (id: string, name: string, photo: string | null, over: Partial<Gift> = {}): Gift => ({
  id,
  name,
  description: '',
  forId: 'sample',
  price: 68,
  currency: 'EUR',
  image: photo ? { sm: `stand-ins/${photo}-500.jpg`, md: `stand-ins/${photo}-960.jpg`, lg: `stand-ins/${photo}-960.jpg` } : null,
  purchaseUrl: null,
  categoryId: 'c-belleza',
  priority: 'medium',
  isFavorite: false,
  createdAt: '2026-11-01T00:00:00Z',
  updatedAt: '2026-11-01T00:00:00Z',
  isReserved: false,
  ...over,
});

/**
 * /dev/components (development builds only): every design-system piece in its states,
 * with static sample data, for design review. Pages that need a session are reviewed in situ.
 */
@Component({
  selector: 'app-components-page',
  imports: [Hero, GiftGrid, CategoryFilter, PriceLabel, ReservationBadge, ProductImage, Modal, FormField, AdminSidebar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="wrap dv">
      <header class="dv-head">
        <h1>Componentes</h1>
        <p>Sistema de diseño Vitrine: tokens, componentes y estados. Referencia completa en docs/DESIGN.md.</p>
      </header>

      <section>
        <h2>Color</h2>
        <ul class="dv-swatches" role="list">
          @for (s of swatches; track s.name) {
            <li>
              <span class="dv-chip" [style.background]="s.value" [class.dv-chip--line]="s.line"></span>
              <span class="dv-sw-name">{{ s.name }}</span>
              <span class="dv-sw-meta">{{ s.value }} · {{ s.use }}</span>
            </li>
          }
        </ul>
      </section>

      <section>
        <h2>Tipografía</h2>
        <div class="dv-type">
          <p class="display text-[clamp(40px,6vw,80px)] text-burgundy m-0">Italiana · Display</p>
          <p class="font-serif italic text-[26px] m-0">Libre Caslon Text cursiva · la voz de la lista</p>
          <p class="text-[18px] m-0">Jost · interfaz, párrafos, formularios. 0123456789 € ¿ñ?</p>
          <p class="caps m-0">Jost versalitas · navegación y etiquetas</p>
        </div>
      </section>

      <section>
        <h2>Hero</h2>
        <app-hero [framed]="true" ctaFragment="top" />
      </section>

      <section>
        <h2>Botones</h2>
        <div class="dv-row">
          <button class="btn btn-primary">Reservar este regalo</button>
          <button class="btn btn-outline">Editar regalo</button>
          <button class="btn btn-primary" disabled>Ya está reservado</button>
          <button class="btn btn-danger btn-sm">Borrar</button>
          <button class="btn btn-ghost">Ahora no</button>
        </div>
      </section>

      <section>
        <h2>PriceLabel · ReservationBadge</h2>
        <div class="dv-row">
          <app-price [value]="68" />
          <app-price [value]="1249.5" currency="GBP" />
          <app-price [value]="189" size="lg" />
          <app-reservation-badge [reserved]="false" />
          <app-reservation-badge [reserved]="true" />
          <app-reservation-badge [reserved]="true" [mine]="true" />
        </div>
      </section>

      <section>
        <h2>ProductImage</h2>
        <div class="dv-row items-end">
          <app-product-image class="w-40 aspect-[3/4]" [image]="gifts[0].image" alt="Con foto" />
          <app-product-image class="w-40 aspect-[3/4]" [image]="null" alt="Sin foto" />
          <app-product-image class="w-40 aspect-[3/4]" [image]="gifts[1].image" alt="Reservado" [dim]="true" />
          <app-product-image class="w-40 aspect-[4/3]" shape="plain" [image]="gifts[2].image" alt="Plano" />
        </div>
      </section>

      <section>
        <h2>GiftCard · GiftGrid</h2>
        <app-gift-grid [gifts]="gifts" [categories]="categories" [mine]="mineSet" />
        <h3>Cargando</h3>
        <app-gift-grid [gifts]="null" [skeletonCount]="4" />
        <h3>Vacío</h3>
        <app-gift-grid [gifts]="[]"><p empty class="font-serif italic text-[18px] text-ink-soft">No hay ningún deseo con estos filtros.</p></app-gift-grid>
      </section>

      <section>
        <h2>CategoryFilter</h2>
        <app-category-filter [categories]="categories" [counts]="{ 'c-belleza': 2, 'c-hogar': 2 }" [total]="9" [active]="active()" />
        <div class="dv-row mt-4">
          <button class="btn btn-ghost" (click)="active.set(null)">Todo</button>
          <button class="btn btn-ghost" (click)="active.set('hogar')">Hogar</button>
          <button class="btn btn-ghost" (click)="active.set('tecnologia')">Tecnología</button>
        </div>
      </section>

      <section>
        <h2>Formulario</h2>
        <div class="grid gap-6 max-w-[520px]">
          <app-form-field label="Nombre" forId="dv-a" hint="Texto de ayuda bajo el campo.">
            <input id="dv-a" class="input" value="Vela de higo y cedro" aria-describedby="dv-a-msg" />
          </app-form-field>
          <app-form-field label="Enlace de compra" forId="dv-b" error="Pega el enlace completo, empezando por https://">
            <input id="dv-b" class="input" value="tienda.com/vela" aria-invalid="true" aria-describedby="dv-b-msg" />
          </app-form-field>
          <app-form-field label="Categoría" forId="dv-c" [optional]="true">
            <select id="dv-c" class="input"><option>Hogar</option></select>
          </app-form-field>
          <label class="check"><input type="checkbox" checked /> Favorito</label>
          <p class="form-alert">El email o la contraseña no son correctos.</p>
        </div>
      </section>

      <section>
        <h2>Modal · Toast</h2>
        <div class="dv-row">
          <button class="btn btn-outline" (click)="modal.set(true)">Abrir modal</button>
          <button class="btn btn-outline" (click)="toasts.success('Reservado. Gracias por hacerlo especial.')">Toast</button>
          <button class="btn btn-outline" (click)="toasts.error('Alguien acaba de reservar este regalo. Elige otro de la lista.')">Toast de error</button>
        </div>
        <app-modal heading="¿Lo reservas?" [(open)]="modal">
          <p class="m-0">Los demás verán que está reservado, pero no quién lo ha hecho.</p>
          <ng-container actions>
            <button class="btn btn-ghost" (click)="modal.set(false)">Ahora no</button>
            <button class="btn btn-primary" (click)="modal.set(false)">Sí, lo reservo</button>
          </ng-container>
        </app-modal>
      </section>

      <section>
        <h2>AdminSidebar</h2>
        <div class="max-w-[260px]"><app-admin-sidebar /></div>
      </section>

      <p class="dv-foot">Header, Navigation y Footer: arriba y abajo de esta página. GiftDetail, ReserveButton, LoginForm, RegisterForm y AdminGiftForm necesitan sesión: se revisan en /wishlist/:id, /login, /register y /admin/gifts/new.</p>
    </div>
  `,
  styles: `
    .dv {
      padding-block: 64px 120px;
    }
    .dv-head h1 {
      margin: 0;
      font: 400 clamp(48px, 8vw, 96px) / 1 var(--font-display);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--color-burgundy);
    }
    .dv-head p,
    .dv-foot {
      font: italic 400 18px/1.5 var(--font-serif);
      color: var(--color-ink-soft);
    }
    section {
      margin-top: 96px;
    }
    h2 {
      margin: 0 0 32px;
      padding-bottom: 14px;
      border-bottom: 1px solid var(--color-line);
      font: 500 12px/1 var(--font-sans);
      letter-spacing: 0.24em;
      text-transform: uppercase;
      color: var(--color-ink-soft);
    }
    h3 {
      margin: 56px 0 24px;
      font: 500 12px/1 var(--font-sans);
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: var(--color-ink-soft);
    }
    .dv-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 20px 24px;
    }
    .dv-swatches {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 24px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .dv-swatches li {
      display: grid;
      gap: 6px;
    }
    .dv-chip {
      height: 72px;
    }
    .dv-chip--line {
      box-shadow: inset 0 0 0 1px var(--color-line);
    }
    .dv-sw-name {
      font-weight: 500;
    }
    .dv-sw-meta {
      font-size: 14px;
      color: var(--color-ink-soft);
    }
    .dv-type {
      display: grid;
      gap: 20px;
    }
  `,
})
export class ComponentsPage {
  readonly toasts = inject(Toasts);
  readonly modal = signal(false);
  readonly active = signal<string | null>('hogar');
  readonly categories = DEMO_CATEGORIES;
  readonly gifts: Gift[] = [
    sample('d1', 'Atomizador de cristal cobalto', 'atomiser', { isFavorite: true }),
    sample('d2', 'Vela de higo y cedro', 'candle', { isReserved: true, categoryId: 'c-hogar', price: 42 }),
    sample('d3', 'Reloj de esfera crema', 'watch', { isReserved: true, categoryId: 'c-accesorios', price: 189 }),
    sample('d4', 'Regalo sin foto todavía', null, { categoryId: 'c-papeleria', price: 24.9 }),
  ];
  readonly mineSet = new Set(['d3']);
  readonly swatches = [
    { name: 'Warm Cream', value: '#F7F1E8', use: 'fondo dominante', line: true },
    { name: 'Soft Ivory', value: '#FCFAF6', use: 'superficies, cabecera', line: true },
    { name: 'Deep Burgundy', value: '#641C2B', use: 'titulares, botón principal', line: false },
    { name: 'Night', value: '#3A0F18', use: 'hero, directorio, footer', line: false },
    { name: 'Cherry Red', value: '#A52B3B', use: 'hover, foco, error', line: false },
    { name: 'Muted Gold', value: '#B89A65', use: 'filetes, marcos (nunca texto)', line: false },
    { name: 'Dark Chocolate', value: '#332421', use: 'texto', line: false },
    { name: 'Ink soft', value: '#6B5651', use: 'texto secundario', line: false },
  ];
}
