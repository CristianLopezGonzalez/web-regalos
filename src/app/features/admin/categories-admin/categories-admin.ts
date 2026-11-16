import { Component, Injector, afterNextRender, inject, signal } from '@angular/core';
import { FormField, FormRoot, form, maxLength, required } from '@angular/forms/signals';
import { errorMessage } from '@app/core/api/error-message';
import { WishlistApi } from '@app/core/api/wishlist-api';
import { Catalogue } from '@app/core/catalogue/catalogue';
import { Category } from '@app/core/models/category';
import { Toasts } from '@app/core/toast/toasts';
import { AdminPageHead } from '../admin-page-head/admin-page-head';

const NAME_MAX = 40;

/** "Hogar", "hogar " and "HÓGAR" are the same shelf. */
const sameName = (a: string, b: string) => {
  const key = (s: string) =>
    s
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  return key(a) === key(b);
};

/** /admin/categories: rename inline, reorder (the directory floors follow this order), add, delete when empty. */
@Component({
  selector: 'app-categories-admin',
  imports: [FormField, FormRoot, AdminPageHead],
  templateUrl: './categories-admin.html',
  styleUrl: './categories-admin.css',
})
export class CategoriesAdmin {
  protected readonly catalogue = inject(Catalogue);
  private readonly api = inject(WishlistApi);
  private readonly toasts = inject(Toasts);
  private readonly injector = inject(Injector);

  protected readonly nameMax = NAME_MAX;
  protected readonly cats = this.catalogue.categories;
  protected readonly busy = signal(false);

  protected readonly newCategory = form(
    signal({ name: '' }),
    (p) => {
      required(p.name);
      maxLength(p.name, NAME_MAX);
    },
    { submission: { action: () => this.add() } },
  );

  /** Inline renames in progress, by category id. Rows without one show the saved name. */
  private readonly drafts = signal<Record<string, string>>({});

  protected draft(c: Category) {
    return this.drafts()[c.id] ?? c.name;
  }

  protected setDraft(c: Category, value: string) {
    this.drafts.update((d) => ({ ...d, [c.id]: value }));
  }

  protected isRenamed(c: Category) {
    return this.draft(c).trim() !== c.name;
  }

  /** The category already using this name (other than `except`), if any. */
  private taken(name: string, except?: string) {
    return (this.catalogue.categories() ?? []).find(
      (c) => c.id !== except && sameName(c.name, name),
    );
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

  private clearDraft(id: string) {
    this.drafts.update(({ [id]: _, ...rest }) => rest);
  }

  protected rename(c: Category) {
    const n = this.draft(c).trim();
    if (!n || n === c.name) return;
    const clash = this.taken(n, c.id);
    if (clash) return this.toasts.error(`Ya hay una categoría «${clash.name}».`);
    return this.run(async () => {
      const saved = await this.api.saveCategory({ id: c.id, name: n });
      this.catalogue.categories.update((l) => l?.map((x) => (x.id === c.id ? saved : x)) ?? l);
      this.clearDraft(c.id);
      this.toasts.success('Categoría renombrada.');
    });
  }

  protected move(i: number, dir: -1 | 1) {
    const list = [...(this.catalogue.categories() ?? [])];
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    const reordered = list.map((c, k) => ({ ...c, sortOrder: k }));
    const before = this.catalogue.categories();
    this.catalogue.categories.set(reordered); // optimistic
    const moved = list[j];
    return this.run(async () => {
      try {
        await this.api.reorderCategories(reordered.map((c) => c.id));
      } catch (e) {
        this.catalogue.categories.set(before);
        throw e;
      }
    }).then(() => this.refocus(moved.name, dir));
  }

  /**
   * The arrows are disabled while saving, which drops focus on <body>. Put it back on the same
   * arrow of the row that moved (or the other one, once it reaches the top or the bottom).
   */
  private refocus(name: string, dir: -1 | 1) {
    afterNextRender(
      () => {
        const btn = (verb: string) =>
          document.querySelector<HTMLButtonElement>(
            `.ca-icon[aria-label="${verb} ${CSS.escape(name)}"]`,
          );
        const same = btn(dir < 0 ? 'Subir' : 'Bajar');
        (same && !same.disabled ? same : btn(dir < 0 ? 'Bajar' : 'Subir'))?.focus();
      },
      { injector: this.injector },
    );
  }

  protected remove(c: Category) {
    return this.run(async () => {
      await this.api.deleteCategory(c.id);
      this.catalogue.categories.update((l) => l?.filter((x) => x.id !== c.id) ?? l);
      this.clearDraft(c.id);
      this.toasts.show(`«${c.name}» borrada.`);
    });
  }

  private async add() {
    const n = this.newCategory.name().value().trim();
    if (!n) return;
    const clash = this.taken(n);
    if (clash) return this.toasts.error(`Ya hay una categoría «${clash.name}».`);
    await this.run(async () => {
      const saved = await this.api.saveCategory({ name: n });
      this.catalogue.categories.update((l) => (l ? [...l, saved] : l));
      this.newCategory().reset({ name: '' });
      this.toasts.success('Categoría añadida.');
    });
  }
}
