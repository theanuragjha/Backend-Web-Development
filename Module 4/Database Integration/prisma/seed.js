'use strict';

const prisma = require('../src/db/prisma');
const seedPosts = require('../src/data/postSeed');

/**
 * Seeds initial database state safely and idempotently.
 */
async function main() {
  console.log('Seeding database...');

  // Ensure default author exists for relational constraints
  const defaultAuthor = await prisma.user.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: 'Default Author',
    },
  });
  console.log(`Ensured author: ${defaultAuthor.name} (id: ${defaultAuthor.id})`);

  // Seed default posts
  for (const post of seedPosts) {
    const record = await prisma.post.upsert({
      where: { id: post.id },
      update: {
        title: post.title,
        body: post.body,
        authorId: post.authorId,
      },
      create: {
        id: post.id,
        title: post.title,
        body: post.body,
        authorId: post.authorId,
      },
    });
    console.log(`Seeded post: "${record.title}" (id: ${record.id})`);
  }

  console.log('Seeding completed successfully.');
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error('Seeding error:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = main;
