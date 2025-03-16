import { Hono } from "hono";
import { PrismaClient } from "@prisma/client";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import * as jwt from "jsonwebtoken";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const app = new Hono();

// JWT Secret - in production, use environment variable
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Middlewares
app.use("*", logger());
app.use("*", cors());
app.use("*", prettyJSON());

// Authentication middleware
async function authenticate(c, next) {
	const authHeader = c.req.header("Authorization");

	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return c.json({ error: "Unauthorized - No token provided" }, 401);
	}

	const token = authHeader.split(" ")[1];

	try {
		const decoded = jwt.verify(token, JWT_SECRET);
		c.set("user", decoded);
		await next();
	} catch (error) {
		return c.json({ error: "Unauthorized - Invalid token" }, 401);
	}
}

// Root route
app.get("/", (c) => {
	return c.text("Hello Hono with Prisma!");
});

// Authentication routes
app.post("/users/register", async (c) => {
	try {
		const body = await c.req.json();

		// Check if user already exists
		const existingUser = await prisma.user.findUnique({
			where: { email: body.email },
		});

		if (existingUser) {
			return c.json({ error: "User with this email already exists" }, 400);
		}

		// Hash password
		const hashedPassword = await bcrypt.hash(body.password, 10);

		// Create user
		const user = await prisma.user.create({
			data: {
				email: body.email,
				name: body.name,
				password: hashedPassword,
			},
			select: {
				id: true,
				email: true,
				name: true,
				createdAt: true,
			},
		});

		// Generate token
		const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
			expiresIn: "7d",
		});

		return c.json({ user, token }, 201);
	} catch (error) {
		if (error instanceof Error) {
			return c.json({ error: error.message }, 500);
		}
		return c.json({ error: "An unknown error occurred" }, 500);
	}
});

app.post("/users/login", async (c) => {
	try {
		const body = await c.req.json();

		// Find user
		const user = await prisma.user.findUnique({
			where: { email: body.email },
		});

		if (!user) {
			return c.json({ error: "Invalid credentials" }, 401);
		}

		// Verify password
		const isPasswordValid = await bcrypt.compare(body.password, user.password);

		if (!isPasswordValid) {
			return c.json({ error: "Invalid credentials" }, 401);
		}

		// Generate token
		const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
			expiresIn: "7d",
		});

		return c.json({
			user: {
				id: user.id,
				email: user.email,
				name: user.name,
			},
			token,
		});
	} catch (error) {
		if (error instanceof Error) {
			return c.json({ error: error.message }, 500);
		}
		return c.json({ error: "An unknown error occurred" }, 500);
	}
});

app.get("/users/profile", authenticate, async (c) => {
	try {
		const userData = c.get("user");

		const user = await prisma.user.findUnique({
			where: { id: userData.id },
			select: {
				id: true,
				email: true,
				name: true,
				createdAt: true,
				posts: {
					select: {
						id: true,
						title: true,
						createdAt: true,
					},
				},
				comments: {
					select: {
						id: true,
						content: true,
						createdAt: true,
					},
				},
			},
		});

		if (!user) {
			return c.json({ error: "User not found" }, 404);
		}

		return c.json({ user });
	} catch (error) {
		if (error instanceof Error) {
			return c.json({ error: error.message }, 500);
		} else {
			return c.json({ error: "An unknown error occurred" }, 500);
		}
	}
});

// User routes
app.get("/users", async (c) => {
	try {
		const users = await prisma.user.findMany({
			select: {
				id: true,
				email: true,
				name: true,
				createdAt: true,
				posts: {
					select: {
						id: true,
						title: true,
					},
				},
			},
		});
		return c.json({ users });
	} catch (error) {
		if (error instanceof Error) {
			console.error(error.message, 500);
		} else {
			console.error("An unknown error occurred.");
		}
	}
});

app.get("/users/:id", async (c) => {
	const id = Number.parseInt(c.req.param("id"));
	try {
		const user = await prisma.user.findUnique({
			where: { id },
			include: {
				posts: true,
				comments: true,
			},
		});
		if (!user) {
			return c.json({ error: "User not found" }, 404);
		}
		return c.json({ user });
	} catch (error) {
		if (error instanceof Error) {
			console.error(error.message, 500);
		} else {
			console.error("An unknown error occurred.");
		}
	}
});

app.post("/users", async (c) => {
	try {
		const body = await c.req.json();
		const user = await prisma.user.create({
			data: {
				email: body.email,
				name: body.name,
				password: body.password, // In a real app, you should hash this
			},
		});
		return c.json({ user }, 201);
	} catch (error) {
		if (error instanceof Error) {
			console.error(error.message, 500);
		} else {
			console.error("An unknown error occurred.");
		}
	}
});

// Post routes
app.get("/posts", async (c) => {
	try {
		const posts = await prisma.post.findMany({
			include: {
				author: {
					select: {
						id: true,
						name: true,
						email: true,
					},
				},
			},
		});
		return c.json({ posts });
	} catch (error) {
		if (error instanceof Error) {
			console.error(error.message, 500);
		} else {
			console.error("An unknown error occurred.");
		}
	}
});

app.get("/posts/:id", async (c) => {
	const id = Number.parseInt(c.req.param("id"));
	try {
		const post = await prisma.post.findUnique({
			where: { id },
			include: {
				author: {
					select: {
						id: true,
						name: true,
						email: true,
					},
				},
				comments: {
					include: {
						author: {
							select: {
								id: true,
								name: true,
							},
						},
					},
				},
			},
		});
		if (!post) {
			return c.json({ error: "Post not found" }, 404);
		}
		return c.json({ post });
	} catch (error) {
		if (error instanceof Error) {
			console.error(error.message, 500);
		} else {
			console.error("An unknown error occurred.");
		}
	}
});

app.post("/posts", async (c) => {
	try {
		const body = await c.req.json();
		const post = await prisma.post.create({
			data: {
				title: body.title,
				content: body.content,
				published: body.published || false,
				authorId: body.authorId,
			},
		});
		return c.json({ post }, 201);
	} catch (error) {
		if (error instanceof Error) {
			console.error(error.message, 500);
		} else {
			console.error("An unknown error occurred.");
		}
	}
});

// Comment routes
app.get("/comments", async (c) => {
	try {
		const comments = await prisma.comment.findMany({
			include: {
				author: {
					select: {
						id: true,
						name: true,
					},
				},
				post: {
					select: {
						id: true,
						title: true,
					},
				},
			},
		});
		return c.json({ comments });
	} catch (error) {
		if (error instanceof Error) {
			console.error(error.message, 500);
		} else {
			console.error("An unknown error occurred.");
		}
	}
});

app.post("/comments", async (c) => {
	try {
		const body = await c.req.json();
		const comment = await prisma.comment.create({
			data: {
				content: body.content,
				authorId: body.authorId,
				postId: body.postId,
			},
		});
		return c.json({ comment }, 201);
	} catch (error) {
		if (error instanceof Error) {
			console.error(error.message, 500);
		} else {
			console.error("An unknown error occurred.");
		}
	}
});

export default app;
