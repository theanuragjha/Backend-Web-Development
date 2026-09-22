const initialUsers = [
  { id: 'u-A', name: 'Member A', role: 'member' },
  { id: 'u-B', name: 'Member B', role: 'member' },
  { id: 'u-mod', name: 'Moderator', role: 'moderator' },
  { id: 'u-admin', name: 'Admin', role: 'admin' },
];

const initialPosts = [
  { id: '1', title: 'Post 1', body: 'Content of post 1', authorId: 'u-A', hidden: false },
  { id: '2', title: 'Post 2', body: 'Content of post 2', authorId: 'u-B', hidden: false },
];

let users = JSON.parse(JSON.stringify(initialUsers));
let posts = JSON.parse(JSON.stringify(initialPosts));

function resetData() {
  users = JSON.parse(JSON.stringify(initialUsers));
  posts = JSON.parse(JSON.stringify(initialPosts));
}

module.exports = {
  get users() {
    return users;
  },
  set users(val) {
    users = val;
  },
  get posts() {
    return posts;
  },
  set posts(val) {
    posts = val;
  },
  resetData,
};
