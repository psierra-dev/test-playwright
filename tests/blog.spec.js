import {test, describe, expect, beforeEach} from "@playwright/test";
import {createBlog, loginWith} from "./helper";

describe("Blog app", () => {
  beforeEach(async ({page, request}) => {
    await request.post("http://localhost:5173/api/testing/reset");
    await request.post("http://localhost:5173/api/users", {
      data: {
        name: "Matti Luukkainen",
        username: "mluukkai",
        password: "salainen",
      },
    });

    await page.goto("http://localhost:5173");
  });

  test("has title", async ({page}) => {
    await page.goto("http://localhost:5173");
    await expect(page).toHaveTitle(/blogs/);
  });

  test("Login form is shown", async ({page}) => {
    await page.goto("http://localhost:5173");

    const locator = page.getByText("Log in to application");
    await expect(locator).toBeVisible();
    await expect(page.getByText("Log in to application")).toBeVisible();
  });

  test("user can login", async ({page}) => {
    await loginWith(page, "mluukkai", "salainen");

    await expect(page.getByText("Matti Luukkainen logged in")).toBeVisible();
  });

  describe("Login", () => {
    test("succeeds with correct credentials", async ({page}) => {
      await loginWith(page, "mluukkai", "salainen");

      await expect(page.getByText("Matti Luukkainen logged in")).toBeVisible();
    });

    test("fails with wrong credentials", async ({page}) => {
      await loginWith(page, "mluukkai", "salainen2");

      await expect(page.getByText("Wrong username or password")).toBeVisible();
    });
  });

  describe("When logged in", () => {
    beforeEach(async ({page}) => {
      await loginWith(page, "mluukkai", "salainen");
    });

    test("a new blog can be created", async ({page}) => {
      await createBlog(
        page,
        "a blog created by playwright",
        "roman riquelme",
        "http://blog.com/1"
      );

      await expect(
        page.locator("text=a blog created by playwright").first()
      ).toBeVisible();
    });

    describe("and a blog exists", () => {
      beforeEach(async ({page}) => {
        await createBlog(
          page,
          "a blog created by playwright",
          "roman riquelme",
          "http://blog.com/1"
        );
      });

      test("like can be changed", async ({page}) => {
        const otherBlogText = page.getByText("a blog created by playwright");
        const otherBlogElement = otherBlogText.locator("..");

        await otherBlogElement.getByRole("button", {name: "view"}).click();
        await otherBlogElement.getByRole("button", {name: "Like"}).click();
        await expect(otherBlogElement.getByText("likes 1")).toBeVisible();
      });
      test("only the owner can see the delete button", async ({page}) => {
        const otherBlogText = page.getByText("a blog created by playwright");
        const otherBlogElement = otherBlogText.locator("..");

        await otherBlogElement.getByRole("button", {name: "view"}).click();
        await expect(
          otherBlogElement.getByText("Matti Luukkainen", {exact: true})
        ).toBeVisible();
        await expect(
          otherBlogElement.getByRole("button", {name: "remove"})
        ).toBeVisible();
      });
      test("a blog can be deleted", async ({page}) => {
        const otherBlogText = page.getByText("a blog created by playwright");
        const otherBlogElement = otherBlogText.locator("..");

        await otherBlogElement.getByRole("button", {name: "view"}).click();
        await otherBlogElement.getByRole("button", {name: "remove"}).click();
        page.on("dialog", async (dialog) => {
          expect(dialog.message()).toBe(
            "Remove blog a blog created by playwright by roman riquelme"
          );
          await dialog.accept();
        });

        await page.click("text=remove");
        await expect(
          page.locator("text=a blog created by playwright").last()
        ).toHaveCount(0);
      });

      test("show asc likes blog", async ({page}) => {
        const blogElements = await page.$$('[data-testid="blog-item"]');
        const likes = await Promise.all(
          blogElements.map(async (blogElement) => {
            const likesText = await blogElement.$eval(
              '[data-testid="blog-likes"]',
              (el) => el.textContent
            );
            return parseInt(likesText.split(" ")[1], 10);
          })
        );
        for (let i = 0; i < likes.length - 1; i++) {
          expect(likes[i]).toBeGreaterThanOrEqual(likes[i + 1]);
        }
      });
    });
  });
});
