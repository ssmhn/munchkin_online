let counter = 0;

export function v4IdGen(): string {
  counter++;
  return `inst-${Date.now()}-${counter}`;
}

export function resetIdGen(): void {
  counter = 0;
}
