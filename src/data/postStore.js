const posts = [
  { id: 1, title: 'First post', body: 'Repository boundaries protect change.', authorId: 7 },
  { id: 2, title: 'Second post', body: 'Services should speak in domain language.', authorId: 8 },
];

let nextId = 3;

module.exports = {
  posts,
  nextId: () => nextId++,
};
