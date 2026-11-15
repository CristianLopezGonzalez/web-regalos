import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Catalogue } from '../../core/catalogue';
import { errorMessage } from '../../core/format';
import { Category } from '../../core/models';
import { Toasts } from '../../core/toast';
import { WishlistApi } from '../../core/wishlist-api';
import { AdminPageHead } from './admin-page-head';

/** /admin/categories: rename inline, reorder (the directory floors follow this order), add, delete when empty. */
@Component({
  selector: 'app-categories-admin',
  imports: [FormsModule, AdminPageHead],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-admin-page-head heading="Categorías" lede="El orden de esta lista es el orden de las plantas del directorio." />

    @if (cats(); as list) {
      <ol class="ca" role="list">
        @for (c of list; track c.id; let i = $index, first = $first, last = $last) {
          <li class="ca-row">
            <span class="ca-floor tabular" aria-hidden="true">{{ i === 0 ? 'G' : i }}</span>
            <form class="ca-edit" (ngSubmit)="rename(c, names[c.id])">
              <label class="sr-only" [for]="'cat-' + c.id">Nombre de la categoría {{ i + 1 }}</label>
              <input class="input" [id]="'cat-' + c.id" [name]="'n' + c.id" [(ngModel)]="names[c.id]" maxlength="40" required />
              @if ((names[c.id] ?? '').trim() !== c.name) {
                <button type="submit" class="btn btn-outline btn-sm" [disabled]="!(names[c.id] ?? '').trim()">Guardar</button>
              }
            </form>
            <span class="ca-count tabular">{{ catalogue.countIn(c.id) }} {{ catalogue.countIn(c.id) === 1 ? 'regalo' : 'regalos' }}</span>
            <div class="ca-actions">
              <button type="button" class="ca-icon" (click)="move(i, -1)" [disabled]="first || busy()" [attr.aria-label]="'Subir ' + c.name">↑</button>
              <button type="button" class="ca-icon" (click)="move(i, 1)" [disabled]="last || busy()" [attr.aria-label]="'Bajar ' + c.name">↓</button>
              <button
                type="button"
                class="btn btn-ghost"
                (click)="remove(c)"
                [disabled]="busy() || catalogue.countIn(c.id) > 0"
                [attr.title]="catalogue.countIn(c.id) > 0 ? 'Mueve sus regalos a otra categoría para poder borrarla' : null"
              >
                Borrar<span class="sr-only"> {{ c.name }}</span>
              </button>
            </div>
          </li>
        }
      </ol>

      <form class="ca-new" (ngSubmit)="add()">
        <div class="field grow">
          <label class="field-label" for="cat-new">Nueva categoría</label>
          <input id="cat-new" class="input" name="newName" [(ngModel)]="newName" maxlength="40" placeholder="Por ejemplo: Libros" />
        </div>
        <button type="submit" class="btn btn-primary btn-sm" [disabled]="!newName.trim() || busy()">Añadir</button>
      </form>
      <p class="field-hint mt-3">Solo se puede borrar una categoría vacía.</p>
    } @else {
      <div class="skeleton h-80" aria-hidden="true"></div>
    }
  `,
  styles: `
    .ca {
      margin: 0;
      padding: 0;
      list-style: none;
      border-top: 1px solid var(--color-line);
    }
    .ca-row {
      display: grid;
      grid-template-columns: 28px minmax(0, 1fr);
      gap: 8px 16px;
      align-items: center;
      padding: 14px 0;
      border-bottom: 1px solid var(--color-line);
    }
    @media (min-width: 768px) {
      .ca-row {
        grid-template-columns: 28px minmax(0, 1fr) 7rem auto;
      }
    }
    .ca-floor {
      color: color-mix(in oklab, var(--color-gold) 70%, var(--color-chocolate));
      font-size: 13px;
    }
    .ca-edit {
      display: flex;
      gap: 12px;
      align-items: center;
    }
    .ca-edit .input {
      min-height: 48px;
      border-color: transparent;
      background: transparent;
      font: 400 17px/1.2 var(--font-serif);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--color-burgundy);
      padding-inline: 8px;
    }
    .ca-edit .input:hover {
      border-color: var(--color-line);
    }
    .ca-edit .input:focus-visible {
      background: var(--color-ivory);
    }
    .ca-count {
      grid-column: 2;
      font-size: 14px;
      color: var(--color-ink-soft);
    }
    .ca-actions {
      grid-column: 2;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    @media (min-width: 768px) {
      .ca-count,
      .ca-actions {
        grid-column: auto;
      }
    }
    .ca-icon {
      width: 44px;
      height: 44px;
      border: 1px solid transparent;
      background: none;
      font-size: 18px;
      cursor: pointer;
      color: var(--color-chocolate);
      transition: border-color 160ms ease;
    }
    .ca-icon:disabled {
      opacity: 0.3;
      cursor: default;
    }
    @media (hover: hover) and (pointer: fine) {
      .ca-icon:hover:not(:disabled) {
        border-color: var(--color-line);
      }
    }
    .ca-new {
      display: flex;
      flex-wrap: wrap;
      align-items: end;
      gap: 16px;
      margin-top: 40px;
      max-width: 560px;
    }
  `,
})
export class CategoriesAdmin {
  readonly catalogue = inject(Catalogue);
  private readonly api = inject(WishlistApi);
  private readonly toasts = inject(Toasts);
  readonly busy = signal(false);
  newName = '';
  names: Record<string, string> = {};

  readonly cats = this.catalogue.categories;

  constructor() {
    // Seed the inline-rename drafts with the current names.
    effect(() => {
      for (const c of this.catalogue.categories() ?? []) if (!(c.id in this.names)) this.names[c.id] = c.name;
    });
  }

  private async run(fn: () => Promise<void>) {
    this.busy.set(true);
    try {
      await fn();
    } catch (e) {
      this.toasts.error(errorMessage(e));
    } finally {
      this.busy.set(false);
    }
  }

  rename(c: Category, name: string | undefined) {
    const n = (name ?? '').trim();
    if (!n || n === c.name) return;
    return this.run(async () => {
      const saved = await this.api.saveCategory({ id: c.id, name: n });
      this.catalogue.categories.update((l) => l?.map((x) => (x.id === c.id ? saved : x)) ?? l);
      this.names[c.id] = saved.name;
      this.toasts.success('Categoría renombrada.');
    });
  }

  move(i: number, dir: -1 | 1) {
    const list = [...(this.catalogue.categories() ?? [])];
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    const reordered = list.map((c, k) => ({ ...c, sortOrder: k }));
    const before = this.catalogue.categories();
    this.catalogue.categories.set(reordered); // optimistic
    return this.run(async () => {
      try {
        await this.api.reorderCategories(reordered.map((c) => c.id));
      } catch (e) {
        this.catalogue.categories.set(before);
        throw e;
      }
    });
  }

  remove(c: Category) {
    return this.run(async () => {
      await this.api.deleteCategory(c.id);
      this.catalogue.categories.update((l) => l?.filter((x) => x.id !== c.id) ?? l);
      this.toasts.show(`«${c.name}» borrada.`);
    });
  }

  add() {
    const n = this.newName.trim();
    if (!n) return;
    return this.run(async () => {
      const saved = await this.api.saveCategory({ name: n });
      this.catalogue.categories.update((l) => (l ? [...l, saved] : l));
      this.names[saved.id] = saved.name;
      this.newName = '';
      this.toasts.success('Categoría añadida.');
    });
  }
}
