/**
 * Blocking anti-flash-of-wrong-theme script, rendered as a literal
 * `<script>` directly inside the root layout's Server Component output (see
 * src/app/layout.tsx). Because it's part of the server-rendered HTML rather
 * than something a Client Component's render creates, it's hydrated like
 * any other DOM node instead of freshly inserted by React on the client.
 *
 * Mirrors the resolution logic in ThemeProvider.tsx (system/light/dark +
 * the same storage key) so the class it sets before paint always matches
 * what the provider settles on after mount.
 */
export function getThemeInitScript(storageKey: string): string {
  return `(function(){try{var s=localStorage.getItem(${JSON.stringify(storageKey)});var t=(s==="light"||s==="dark"||s==="system")?s:"system";var r=t==="system"?(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):t;var d=document.documentElement;if(r==="dark")d.classList.add("dark");else d.classList.remove("dark");d.style.colorScheme=r;}catch(e){}})();`;
}
