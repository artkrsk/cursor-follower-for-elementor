export interface IElasticModel {
  /** Applies squash from state.lag; returns true when visually settled. */
  frame(): boolean
}
