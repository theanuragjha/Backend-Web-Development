'use strict';

const { PrismaClient } = require('@prisma/client');

// One shared PrismaClient instance for this application process
const prisma = new PrismaClient();

module.exports = prisma;
