const initialPosts = [
  {
    id: 1,
    title: 'First post',
    body: 'Repository boundaries protect change.',
    authorId: 7,
  },
  {
    id: 2,
    title: 'Second post',
    body: 'Services should speak in domain language.',
    authorId: 8,
  },
];

const posts = new Map(initialPosts.map((post) => [post.id, post]));

let nextId = 3;

// Repository boundary: storage access stays here so the service can later
// switch from this in-memory Map to a Prisma-backed implementation
// without changing the service layer.

function findAll() {
  return Array.from(posts.values());
}

function findById(id) {
  return posts.get(Number(id)) || null;
}

function create(fields) {
  const post = {
    id: nextId++,
    ...fields,
  };

  posts.set(post.id, post);

  return post;
}

function update(id, patch) {
  const post = findById(id);

  if (!post) return null;

  Object.assign(post, patch);

  return post;
}

function remove(id) {
  const postId = Number(id);

  if (!posts.has(postId)) return false;

  posts.delete(postId);

  return true;
}

module.exports = {
  findAll,
  findById,
  create,
  update,
  remove,
};