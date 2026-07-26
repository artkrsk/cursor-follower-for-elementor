import type { ITargetScope } from '@engine'

/**
 * Runtime twin of docs/demos/rules-filter-example.php — the PHP shows the
 * filter a theme or plugin writes; these scopes are the same rules handed to
 * the docs engine at boot (targetScopes is construction-only, so they ride
 * the single createCursor call in Layout.vue). Change one, change the other.
 */
export const rulesDemoScopes: ITargetScope[] = [
  {
    scope: '.demo-rules-scope',
    rules: [
      {
        selector: ':scope .demo-rules-card',
        payload: { shape: 'pill', label: 'Open' }
      }
    ]
  }
]
