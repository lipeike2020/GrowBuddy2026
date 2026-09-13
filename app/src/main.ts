import { isProductHash } from './entry';
if (isProductHash(location.hash)) {
  void import('./product');
} else {
  void import('./website');
  window.addEventListener('hashchange', () => {
    if (isProductHash(location.hash)) location.reload();
  });
}
