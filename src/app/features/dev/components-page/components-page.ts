import { Component, inject, signal } from '@angular/core';
import { DEMO_CATEGORIES } from '@app/core/demo/demo-data';
import { Gift } from '@app/core/models/gift';
import { Toasts } from '@app/core/toast/toasts';
import { AdminSidebar } from '@app/features/admin/admin-sidebar/admin-sidebar';
import { Modal } from '@app/design-system/feedback/modal/modal';
import { LabeledField } from '@app/design-system/forms/labeled-field/labeled-field';
import { CategoryFilter } from '@app/design-system/gift/category-filter/category-filter';
import { GiftGrid } from '@app/design-system/gift/gift-grid/gift-grid';
import { PriceLabel } from '@app/design-system/gift/price-label/price-label';
import { ProductImage } from '@app/design-system/gift/product-image/product-image';
import { ReservationBadge } from '@app/design-system/gift/reservation-badge/reservation-badge';
import { Hero } from '@app/features/home/hero/hero';

const sample = (
  id: string,
  name: string,
  photo: string | null,
  over: Partial<Gift> = {},
): Gift => ({
  id,
  name,
  description: '',
  forId: 'sample',
  price: 68,
  currency: 'EUR',
  image: photo
    ? {
        sm: `stand-ins/${photo}-500.jpg`,
        md: `stand-ins/${photo}-960.jpg`,
        lg: `stand-ins/${photo}-960.jpg`,
      }
    : null,
  purchaseUrl: null,
  extraUrls: [],
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
  imports: [
    Hero,
    GiftGrid,
    CategoryFilter,
    PriceLabel,
    ReservationBadge,
    ProductImage,
    Modal,
    LabeledField,
    AdminSidebar,
  ],
  templateUrl: './components-page.html',
  styleUrl: './components-page.css',
})
export class ComponentsPage {
  protected readonly toasts = inject(Toasts);

  protected readonly modal = signal(false);
  protected readonly active = signal<string | null>('hogar');
  protected readonly categories = DEMO_CATEGORIES;
  protected readonly gifts: Gift[] = [
    sample('d1', 'Atomizador de cristal cobalto', 'atomiser', { isFavorite: true }),
    sample('d2', 'Vela de higo y cedro', 'candle', {
      isReserved: true,
      categoryId: 'c-hogar',
      price: 42,
    }),
    sample('d3', 'Reloj de esfera crema', 'watch', {
      isReserved: true,
      categoryId: 'c-accesorios',
      price: 189,
    }),
    sample('d4', 'Regalo sin foto todavía', null, { categoryId: 'c-papeleria', price: 24.9 }),
  ];
  protected readonly mineSet = new Set(['d3']);
  protected readonly swatches = [
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
