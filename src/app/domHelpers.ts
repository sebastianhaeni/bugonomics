export function requiredChild<T extends Element>(
  root: ParentNode,
  selector: string,
): T {
  const node = root.querySelector<T>(selector);
  if (!node) {
    throw new Error(`Missing required child: ${selector}`);
  }
  return node;
}

export function createPlaceholder(text: string): HTMLElement {
  const placeholder = document.createElement("p");
  placeholder.className = "placeholder";
  placeholder.textContent = text;
  return placeholder;
}
