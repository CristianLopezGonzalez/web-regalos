export type Role = 'owner' | 'family';

export interface Profile {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  /** Has a wish list of their own: the owner, and anyone invited "con su propia lista" (e.g. Angela). */
  hasList: boolean;
  /** Plans the presents for the family with the other planner ("Nuestros regalos"): Cristian and Ángela. */
  isPlanner: boolean;
  createdAt: string;
}
