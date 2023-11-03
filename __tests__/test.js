const request = require("supertest");
const app = require("../app");

describe("test suite for lms", () => {
  describe("GET /", () => {
    it('responds with a 200 status code and renders the "index" view', async () => {
      const response = await request(app).get("/");
      expect(response.status).toBe(200);
    });
  });

  describe("GET /adminhome", () => {
    it('responds with a 200 status code and renders the "adminhome" view', async () => {
      const response = await request(app).get("/adminhome");
      expect(response.status).toBe(200);
    });
  });

  describe("GET /create-course", () => {
    it('responds with a 200 status code and renders the "create-course" view', async () => {
      const response = await request(app).get("/create-course");
      expect(response.status).toBe(200);
    });
  });

  describe("POST /create-course", () => {
    it("responds with a 302 status code after creating a new course", async () => {
      const response = await request(app)
        .post("/create-course")
        .send({ title: "New Course", description: "Course Description" });

      expect(response.status).toBe(302);
    });
  });

  describe("Authentication", () => {
    describe("GET /login", () => {
      it('responds with a 200 status code and renders the "login" view', async () => {
        const response = await request(app).get("/login");
        expect(response.status).toBe(200);
      });
    });

    describe("POST /session", () => {
      it("responds with a 302 status code and redirects to the appropriate page after successful login", async () => {
        const response = await request(app).post("/session").send({
          email: "user@example.com",
          password: "password",
          role: "student",
        });

        expect(response.status).toBe(302);
      });
    });

    describe("GET /signup", () => {
      it('responds with a 200 status code and renders the "signup" view', async () => {
        const response = await request(app).get("/signup");
        expect(response.status).toBe(200);
      });
    });
  });
});
