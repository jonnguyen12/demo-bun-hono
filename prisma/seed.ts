import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
	// Clean the database first (optional)
	await prisma.comment.deleteMany();
	await prisma.post.deleteMany();
	await prisma.user.deleteMany();

	console.log("Seeding database...");

	// Create users
	const alice = await prisma.user.create({
		data: {
			email: "alice@example.com",
			name: "Alice Johnson",
			password: "password123", // In a real app, this should be hashed
		},
	});

	const bob = await prisma.user.create({
		data: {
			email: "bob@example.com",
			name: "Bob Smith",
			password: "password456", // In a real app, this should be hashed
		},
	});

	const charlie = await prisma.user.create({
		data: {
			email: "charlie@example.com",
			name: "Charlie Brown",
			password: "password789", // In a real app, this should be hashed
		},
	});

	console.log("Created users:", { alice, bob, charlie });

	// Create posts
	const post1 = await prisma.post.create({
		data: {
			title: "Getting Started with Prisma",
			content:
				"This is a comprehensive guide to using Prisma with TypeScript and PostgreSQL.",
			published: true,
			authorId: alice.id,
		},
	});

	const post2 = await prisma.post.create({
		data: {
			title: "Building APIs with Hono",
			content:
				"Learn how to build fast and efficient APIs using the Hono framework.",
			published: true,
			authorId: alice.id,
		},
	});

	const post3 = await prisma.post.create({
		data: {
			title: "Why Bun is the Future",
			content: "Exploring the benefits of using Bun as a JavaScript runtime.",
			published: false,
			authorId: bob.id,
		},
	});

	console.log("Created posts:", { post1, post2, post3 });

	// Create comments
	const comment1 = await prisma.comment.create({
		data: {
			content: "Great article! Very helpful for beginners.",
			authorId: bob.id,
			postId: post1.id,
		},
	});

	const comment2 = await prisma.comment.create({
		data: {
			content: "I have a question about the Prisma setup...",
			authorId: charlie.id,
			postId: post1.id,
		},
	});

	const comment3 = await prisma.comment.create({
		data: {
			content: "Hono is indeed a great framework!",
			authorId: charlie.id,
			postId: post2.id,
		},
	});

	const comment4 = await prisma.comment.create({
		data: {
			content: "Looking forward to the full release of this post.",
			authorId: alice.id,
			postId: post3.id,
		},
	});

	console.log("Created comments:", { comment1, comment2, comment3, comment4 });

	console.log("Database seeding completed successfully!");
}

main()
	.catch((e) => {
		console.error("Error seeding database:", e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
