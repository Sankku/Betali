export const style = document.createElement("style");
style.textContent = `
@keyframes modalEnter {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
`;
document.head.appendChild(style);
