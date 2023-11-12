const request = require("supertest");
var cheerio = require("cheerio");
const db = require("../models");
const app = require("../app");

let server, agent;
function extractCsrfToken(res) {
  var $ = cheerio.load(res.text);
  return $("[name=_csrf]").val();
}

const login = async (agent, username, password) => {
  let res = await agent.get("/login");
  let csrfToken = extractCsrfToken(res);
  res = await agent.post("/session").send({
    email: username,
    password: password,
    _csrf: csrfToken,
  });
};

describe("LMS test suite", function () {
  beforeAll(async () => {
    await db.sequelize.sync({ force: true });
    server = app.listen(2000, () => {});
    agent = request.agent(server);
  });
  afterAll(async () => {
    try {
      await db.sequelize.close();
      await server.close();
    } catch (error) {
      console.log(error);
    }
  });
  test("signup", async () => {
    let res = await agent.get("/signup");
    const csrfToken = extractCsrfToken(res);
    res = await agent.post("/users").send({
      name: "arun",
      email: "arun@test.com",
      password: "arunarun",
      role: "admin",
      _csrf: csrfToken,
    });
  });
  test("signin by user valid credentials", async () => {
    let store = await agent.get("/login");
    const csrfToken = extractCsrfToken(store);
    store = await agent.post("/session").send({
      email: "arun@test.com",
      password: "arunarun",
      role: "admin",
      _csrf: csrfToken,
    });
  });
  test("Sign out", async () => {
    str = await agent.get("/admin");
  });
  test("create course by admin", async () => {
    let store = await agent.get("/create-course");
    const csrfToken = extractCsrfToken(store);
    store = await agent.post("/courses").send({
      title: "DSA",
      description: "This a DSA course",
      educator: "Arun",
      userId: 1,
      _csrf: csrfToken,
    });
    expect(store.statusCode).toBe(500);
  });
  test("create a chapter by admin", async () => {
    let store = await agent.get("/create-chapter");
    const csrfToken = extractCsrfToken(store);
    store = await agent.post("/chapters").send({
      title: "Introduction",
      description: "Tells about the introduction",
      courseId: 1,
      _csrf: csrfToken,
    });
    expect(store.statusCode).toBe(500);
  });
  test("create a page by admin", async () => {
    let store = await agent.get("/create-page");
    const csrfToken = extractCsrfToken(store);
    store = await agent.post("/pages").send({
      title: "What is DSA",
      contents:"deeeeeeeeeeeeeeeeedeeeeerfeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeemmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmlllllllllllllllllllllllllllllllllllllllllllllllll",
      chapterId: 1,
      _csrf: csrfToken,
    });
    expect(store.statusCode).toBe(500);
  });
  test("display", async () => {
    let store = await agent.get("/display");
    expect(store.statusCode).toBe(302);
  });
  test("change password by user", async () => {
    let store = await agent.get("/changepass");
    const csrfToken = extractCsrfToken(store);
    store = await agent.post("/users").send({
      oldpassword: "arunarun",
      newpassword: "arun123",
      _csrf: csrfToken,
    });
   
  })
});
