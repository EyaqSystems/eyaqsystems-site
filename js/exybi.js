(function () {
  'use strict';

  var filters = document.querySelectorAll('.ex-filters button');
  var posts = document.querySelectorAll('.ex-post');
  if (!filters.length) return;

  function showCategory(category) {
    Array.prototype.forEach.call(posts, function (post) {
      post.hidden = category !== 'todo' && post.getAttribute('data-category') !== category;
    });
    Array.prototype.forEach.call(filters, function (filter) {
      filter.setAttribute('aria-pressed', filter.getAttribute('data-category') === category ? 'true' : 'false');
    });
  }

  Array.prototype.forEach.call(filters, function (filter) {
    filter.addEventListener('click', function () { showCategory(filter.getAttribute('data-category')); });
  });
})();
