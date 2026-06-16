import { computed, type ComputedRef } from "vue"

import type { ValidationIssue } from "../docker/compose/composeValidator"

export function useFieldError(
  issues: ValidationIssue[] = [],
  field: string,
): ComputedRef<string[]> {
  return computed(() => {
    return issues.filter((i: ValidationIssue) => i.path === field).map((i) => i.message)
  })
}

export type { ValidationIssue } from "../docker/compose/composeValidator"
