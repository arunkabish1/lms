const express = require("express");
var csrf = require("tiny-csrf");
const app = express();
const bodyParser = require("body-parser");
var cookieParser = require("cookie-parser");
const path = require("path");
const {
  Course,
  Chapter,
  Page,
  User,
  Register,
  Regpages,
  RegChapter,
} = require("./models");
const flash = require("connect-flash");
const jsonParser = express.json();
app.set("views", path.join(__dirname, "views"));

const passport = require("passport");
var connectEnsureLogin = require("connect-ensure-login");
var session = require("express-session");
const LocalStrategy = require("passport-local");
const bcrypt = require("bcrypt");
const { ESLint } = require("eslint");

const saltRounds = 10;
app.use(flash());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser("shh! some secret string"));
app.use(csrf("this_should_be_32_character_long", ["POST", "PUT", "DELETE"]));
app.use(express.static(path.join(__dirname, "/public")));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use((req, res, next) => {
  res.set("Cache-Control", "max-age=0, no-cache, must-revalidate");
  next();
});

app.use(
  session({
    secret: "my-super-secret-key-21212121212121212",
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
    },
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    (username, password, done) => {
      User.findOne({ where: { email: username } })
        .then(async (user) => {
          const result = await bcrypt.compare(password, user.password);
          if (result) {
            return done(null, user);
          } else {
            return done(null, false, { message: "Password is incorrect" });
          }
        })
        .catch(() => {
          return done(null, false, {
            message: "This email is not Registered",
          });
        });
    }
  )
);

passport.serializeUser((user, done) => {
  console.log("serializing user", user.id);
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findByPk(id)
    .then((user) => {
      done(null, user);
    })
    .catch((err) => {
      done(err, null);
    });
});

app.get("/", (req, res) => {
  res.redirect("/index");
});

app.get("/index", (req, res) => {
  res.render("index", { title: "Home", csrfToken: req.csrfToken() });
  return;
});
//adminhome
app.get("/adminhome", connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
  try {
    const courses = await Course.findAll();
    const chapters = await Chapter.findAll();
    const pages = await Page.findAll();
    const userRole = req.user.role;
    res.render("adminhome", {
      messages: req.flash(),
      userRole,
      courses,
      educator: req.user.name,
      chapters,
      pages,
      title: "Admin Home",
      csrfToken: req.csrfToken(),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error Occured" });
  }
});
// create course
app.get("/create-course", connectEnsureLogin.ensureLoggedIn(), (req, res) => {
  res.render("create-course", {
    title: "Create Course",
    messages: req.flash(),
    csrfToken: req.csrfToken(),
  });
});

app.post(
  "/create-course",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    try {
      const { title, description } = req.body;
      const courseTitle = typeof title === "string" ? title : title.toString();
      const course = await Course.create({
        title: courseTitle,
        description: description,
        userId: req.user.id,
        educator: req.user.name,
      });
      req.flash("success", "Course created successfully");
      return res.redirect(`/create-chapter?courseId=${course.id}`);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Error Occured" });
    }
  }
);

// Create a new chapter
app.get(
  "/create-chapter",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    const courseId = req.query.courseId;
    const chapters = await Chapter.findAll({ where: { courseId } });
    const userId = req.user.id;
    if (!courseId) {
      return res.status(400).json({ error: "Course ID is missing" });
    }

    res.render("create-chapter", {
      courseId,

      messages: req.flash(),
      chapters,
      userId,
      title: "Create Chapter",
      csrfToken: req.csrfToken(),
    });
  }
);
// POST to create a new chapter
app.post(
  "/create-chapter",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    try {
      const { title, description, courseId } = req.body;

      if (!courseId) {
        return res.status(400).json({ error: "Course ID is missing" });
      }

      await Chapter.create({
        title: title,
        description: description,
        courseId: courseId,
        isCompleted: false,
      });
      req.flash("success", "Chapter created successfully");
      res.redirect(`/create-chapter?courseId=${courseId}`);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Error Occured" });
    }
  }
);

// Display pages
app.get("/pages", connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
  try {
    const chapterId = req.query.chapterId;
    const courseId = req.query.courseId;

    const chapter = await Chapter.findByPk(chapterId);
    const pages = await Page.findAll({ where: { chapterId } });
    const userRole = req.user.role;
    const userId = req.user.id;
    console.log("courseId:", courseId);


    if (!chapter) {
      return res.status(404).json({ error: "Chapter not found" });
    }

    res.render("pages", {
      chapterId,
      userRole,
      courseId,
      chapterTitle: chapter.title,
      pages,
      title: "Pages",
      userId,
      csrfToken: req.csrfToken(),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error Occured" });
  }
});

// Create a display page
app.post("/pages", connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
  try {
    const { chapterId } = req.body;

    if (!chapterId) {
      return res.status(400).json({ error: "Chapter ID is missing" });
    }

    res.redirect("create-page");
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error Occured" });
  }
});

// create-page
app.get(
  "/create-page",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    try {
      const chapterId = req.query.chapterId;
      const chapters = await Chapter.findAll();
      const chapter = await Chapter.findByPk(chapterId);
      const pages = await Page.findAll({ where: { chapterId } });
      const courseId = req.query.courseId;
      const userId = req.user.id;
      console.log(courseId);
      console.log(chapterId);

      if (!chapter) {
        return res.status(404).json({ error: "Chapter not found" });
      }

      res.render("create-page", {
        chapters,
        courseId,
        messages: req.flash(),
        chapterId,
        chapterTitle: chapter.title,
        pages,
        userId,
        title: "Create Page",
        csrfToken: req.csrfToken(),
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Error Occured" });
    }
  }
);

app.post(
  "/create-page",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    try {

      const { title, content, chapterId, courseId } = req.body;
      if (courseId == null) {
        courseId = req.query.courseId;
      }
      if (!chapterId) {
        return res.status(400).json({ error: "Chapter ID is missing" });
      }
      if (!courseId) {
        return res.status(400).json({ error: "Course ID is missing" });
      }

      await Page.create({
        title: title,
        content: content,
        chapterId: chapterId,
        courseId: courseId,
      });
      req.flash("success", "You created the Page successfully");
      res.redirect(`/pages?chapterId=${chapterId}&courseId=${courseId}`);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Error Occured" });
    }
  }
);

// Display courses,chapters,and pages
app.get("/display", connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
  try {
    const courses = await Course.findAll();
    const chapters = await Chapter.findAll();
    const pages = await Page.findAll();
    const courseId = req.body.courseId;
    const userRole = req.query.role;
    res.render("display", {
      courses: nonEnrolledCourses,
      chapters,
      courses,
      pages,
      title: "Display",
      csrfToken: req.csrfToken(),
      userRole,
      courseId,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error Occurred" });
  }
});

// view chapter when clicked
app.get(
  "/chapter-view",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    const courseId = req.query.courseId;
    const role = req.user.role;
    try {
      const course = await Course.findByPk(courseId);
      if (!course) {
        return res.status(404).json({ error: "Course not found" });
      }
      const chapters = await Chapter.findAll({ where: { courseId } });
      const courseTitle = course.title;
      const educator = course.educator;

      const description = course.description;
      res.render("chapter-view", {
        course,
        courseTitle,
        courseId,
        description,
        educator,
        role,
        chapters,
        title: "Chapter View",
        csrfToken: req.csrfToken(),
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Error Occured" });
    }
  }
);
app.get("/adminpages", connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
  const chapterId = req.query.chapterId;
  const courseId = req.query.courseId;
  const userId = req.user.id;
  const role = req.user.role;
  const requestedPageId = req.query.pageId;
  const registeredPage = await Regpages.findOne({
    where: {
      userId,
      pageId: requestedPageId,
    },
  });

  try {
    const chapter = await Chapter.findByPk(chapterId);

    const page = requestedPageId
      ? await Page.findByPk(requestedPageId)
      : await Page.findOne({ where: { chapterId }, order: [["createdAt", "ASC"]] });

    const pages = page ? [page] : [];

    const pageTitle = page ? page.title : "";
    const pageContent = page ? page.content : "";
    const chapterTitle = chapter.title;

    res.render("adminpages", {
      messages: req.flash(),
      pages,
      userId,
      pageId: page ? page.id : null,
      courseId,
      chapter,
      role,
      page,
      registeredPage: registeredPage,
      chapterId,
      chapterTitle,
      pageTitle,
      pageContent,
      title: "Admin Pages",
      csrfToken: req.csrfToken(),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error Occurred" });
  }
});

// studenthome
app.get(
  "/studenthome",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    try {
      const allcourses = await Course.findAll();
      const chapters = await Chapter.findAll();
      const pages = await Page.findAll();
      const userRole = req.user.role;
      const userName = req.user.name;
      const userId = req.user.id;
      const currentUser = req.user.id;
      const enrolledCourses = await Register.findAll({ where: { userId } });

      const currentUserCourses = allcourses.filter((course) => {
        const matchingCourseIds = enrolledCourses.map(
          (enrolledCourse) => enrolledCourse.courseId
        );
        return matchingCourseIds.includes(course.id);
      });

      const nonEnrolledCourses = allcourses.filter((course) => {
        return !enrolledCourses.some(
          (enrolledCourse) => enrolledCourse.courseId === course.id
        );
      });

      res.render("studenthome", {
        messages: req.flash(),
        currentUserCourses: currentUserCourses,
        chapters,
        courses: nonEnrolledCourses,
        allcourses,
        courseId: req.query.courseId,
        enrolledCourses,
        availableCourses: nonEnrolledCourses,
        userRole,
        userId,
        pages,
        title: "Student Home",
        csrfToken: req.csrfToken(),
        userName,
        currentUser,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json;
    }
  }
);

// signup page
app.get("/signup", (req, res) => {
  res.render("signup", {
    title: "Sign Up",
    messages: req.flash(),
    csrfToken: req.csrfToken(),
  });
});

// create user
app.get("/users", (req, res) => {
  res.render("users", {
    title: "Users",
    messages: req.flash(),
    csrfToken: req.csrfToken(),
  });
});
app.post("/users", async (req, res) => {
  try {
    const existingUser = await User.findOne({
      where: {
        email: req.body.email,
      },
    });

    if (existingUser) {
      req.flash("error", "Email already exists!");
      return res.redirect("/signup");
    }

    if (req.body.email.length == 0) {
      req.flash("error", "Email cannot be empty!");
      return res.redirect("/signup");
    }
    if (req.body.name.length == 0) {
      req.flash("error", "Name must be filled!");
      return res.redirect("/signup");
    }
    if (req.body.password.length <= 8) {
      req.flash("error", "Password is not strong as it is less than 8 characters");
      return res.redirect("/signup");
    }

    const hashedPassword = await bcrypt.hash(req.body.password, saltRounds);

    const user = await User.create({
      name: req.body.name,
      email: req.body.email,
      password: hashedPassword,
      role: req.body.role,
    });

    req.login(user, (err) => {
      if (err) {
        console.error(err);
        res.redirect("/signup");
      }

      if (req.body.role === "student") {
        req.flash("success", "Student Account created successfully");
        res.redirect("/studenthome");
      } else {
        req.flash("success", "Admin Account created successfully");
        res.redirect("/adminhome");
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error Occurred" });
  }
});


// login and session
app.get("/login", (req, res) => {
  res.render("login", {
    messages: req.flash(),
    title: "Login",
    csrfToken: req.csrfToken(),
  });
});

app.post(
  "/login",
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  (req, res) => {
    if (email.length == 0) {
      req.flash("error", "Email not be empty!");
      return res.redirect("/login");
    }
    if (password.length <= 0) {
      req.flash(
        "error",
        "passoword can not be empty!"
      );
      return res.redirect("/login");
    }
    if (req.user.role !== req.body.role) {
      req.flash("error", "Check your Role");
      return res.redirect("/login");
    }
    console.log(req.user);
    if (req.user.role === req.body.role) {
      if (req.body.role === "student") {
        req.flash("success", "Student logged in successfully");
        res.redirect("/studenthome");
      } else {
        req.flash("success", "Admin logged in successfully");
        res.redirect("/adminhome");
      }
    } else {
      console.log("Flash messages:", req.flash());
      req.flash("error", "Check your credentials");
      res.redirect("/login");
    }
  }
);
app.get("/session", (req, res) => {
  res.render("session", {
    title: "Login",
    messages: req.flash(),
    csrfToken: req.csrfToken(),
  });
});
app.post(
  "/session",
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  (req, res) => {
    console.log(req.user);
    if (req.user.role === req.body.role) {
      if (req.body.role === "student") {
        req.flash("success", "Student logged in successfully");
        res.redirect("/studenthome");
      } else {
        req.flash("success", "Admin logged in successfully");
        res.redirect("/adminhome");
      }
    } else {
      console.log("Flash messages:", req.flash());
      req.flash("error", "Check your credentials");
      res.redirect("/login");
    }
  }
);

// signout page
app.get("/signout", connectEnsureLogin.ensureLoggedIn(), (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect("/login");
  });
});

app.get(
  "/admincourses",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const admincourses = await Course.findAll({
        where: { userId },
      });
      const chapters = await Chapter.findAll();
      const pages = await Page.findAll();

      res.render("admincourses", {
        admincourses,
        chapters,
        pages,
        title: "Admin Courses",
        csrfToken: req.csrfToken(),
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Error Occurred" });
    }
  }
);

app.get(
  "/studentdisplay",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    const courseId = req.query.courseId;
    const userId = req.user.id;

    try {
      const course = await Course.findByPk(courseId);
      if (!course) {
        return res.status(404).json({ error: "Course not found" });
      }

      const isEnrolled = await Register.findOne({
        where: { userId, courseId },
      });

      if (isEnrolled) {
        const chapters = await Chapter.findAll({ where: { courseId } });
        const courseTitle = course.title;
        const educator = course.educator;
        const description = course.description;
        res.render("chapter-view", {
          course,
          courseTitle,
          description,
          educator,
          chapters,
          courseId: courseId,
          title: "Chapter View",
          csrfToken: req.csrfToken(),
          messages: req.flash(),
        });
      } else {
        const chapters = await Chapter.findAll({ where: { courseId } });
        const courseTitle = course.title;
        const educator = course.educator;
        const description = course.description;
        res.render("studentdisplay", {
          course,
          courseTitle,
          description,
          educator,
          chapters,
          courseId: courseId,
          title: "Course View",
          csrfToken: req.csrfToken(),
          messages: req.flash(),
          userRole: req.user.role,
        });
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Error Occurred" });
    }
  }
);

// chamnge password
app.get("/changepass", connectEnsureLogin.ensureLoggedIn(), (req, res) => {
  const userId = req.user.id;
  const role = req.user.role;
  res.render("changepass", {
    userId,
    role,
    title: "Change Password",
    messages: req.flash(),
    csrfToken: req.csrfToken(),
  });
});
app.post(
  "/changepass",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    const userId = req.body.userId;
    const oldPassword = req.body.oldpassword;
    const newPassword = req.body.newpassword;
    console.log("User ID:", userId);
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        req.flash("error", "User not found.");
        return res.redirect("/changepass");
      }
      const passmatch = await bcrypt.compare(oldPassword, user.password);
      if (!passmatch) {
        req.flash("error", "Incorrect old password.");
        return res.redirect("/changepass");
      }
      const hashpassword = await bcrypt.hash(newPassword, 10);
      user.password = hashpassword;
      console.log("User before save:", user);
      await user.save();
      console.log("User after save:", user);

      req.flash("success", "Password changed to New Password.");
      console.log("Old Password:", oldPassword);
      console.log("New Password:", newPassword);

      if (user.role === "student") {
        res.redirect("/studenthome");
      } else {
        res.redirect("/adminhome");
      }
    } catch (error) {
      console.error(error);
      req.flash("error", "Server Error,Try again later :( ");
      res.redirect("/changepass");
    }
  }
);
// after initial submission
// enroll
app.get(
  "/enroll/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    res.render("enroll", {
      title: "Enroll",
      messages: req.flash(),
      csrfToken: req.csrfToken(),
      userId: req.user.id,
      courseId: req.query.courseId,
    });
  }
);
app.post(
  "/enroll/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    try {
      console.log("Enroll route in Outer");
      console.log("Req body:", req.user.id);
      console.log("Req body:", req.params.id);

      const courseId = req.params.id;
      const userId = req.user.id;

      if (!userId || !courseId) {
        return res.status(400).send("Invalid userId or courseId");
      }

      const existingRegistration = await Register.findOne({
        where: { userId, courseId },
      });

      if (existingRegistration) {
        return res.redirect(`/chapter-view?courseId=${courseId}`);
      }

      await Register.create({ userId, courseId });

      return res.redirect(`/chapter-view?courseId=${courseId}`);
    } catch (error) {
      console.error(error);
      return res.status(500).send("Server Error");
    }
  }
);

app.post(
  "/extenroll/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    try {
      console.log("Enroll route in Outer");
      console.log("Req body:", req.user.id);
      console.log("Req body:", req.params.id);

      const courseId = req.params.id;
      const userId = req.user.id;

      if (!userId || !courseId) {
        return res.status(400).send("Invalid userId or courseId");
      }

      const existingRegistration = await Register.findOne({
        where: { userId, courseId },
      });

      if (existingRegistration) {
        return res.redirect(`/chapter-view?courseId=${courseId}`);
      }

      await Register.create({ userId, courseId });

      return res.redirect(`/chapter-view?courseId=${courseId}`);
    } catch (error) {
      console.error(error);
      // Handle the error and send an appropriate response
      return res.status(500).send("Internal Server Error");
    }
  }
);

// ext enroll
app.get(
  "/extenroll/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    res.render("extenroll", {
      title: "Enroll",
      messages: req.flash(),
      csrfToken: req.csrfToken(),
      userId: req.user.id,
      courseId: req.query.courseId,
    });
  }
);

app.post(
  "/extenroll/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    try {
      console.log("Enroll route in Outer");
      console.log("Req body:", req.body.userId);
      console.log("Req body:", req.body.courseId);
      const courseId = req.params.id;
      const userId = req.user.id;
      const existingRegistration = await Register.findOne({ userId, courseId });

      if (existingRegistration) {
        res.redirect(`/chapter-view?courseId=${courseId}`);
      }
      await Register.create({ userId, courseId });

      res.redirect(`/chapter-view?courseId=${courseId}`);
    } catch (error) {
      console.error(error);
    }
  }
);

//Register route for already Register
app.get(
  "/check-enroll",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const courseId = req.query.courseId;
      const registration = await Register.findOne({
        where: { userId, courseId },
      });
      res.json({ enrolled: !!registration });
    } catch (error) {
      console.error("Error checking enrollment:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// pagelist

app.get("/pagelist", connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
  const chapterId = req.query.chapterId;
  const pageId = req.query.pageId;
  const userId = req.user.id;
  const role = req.user.role;
  const courseId = req.query.courseId;

  async function fetchRegisteredPages(userId) {
    try {
      // Implement your logic to fetch registered pages here
      // Example: query your database or use any other method
      const registeredPages = await Regpages.findAll({
        where: { userId },
        attributes: ['pageId'],
      });

      return registeredPages.map((registeredPage) => registeredPage.pageId);
    } catch (error) {
      console.error('Error fetching registered pages:', error);
      throw error;
    }
  }

  try {
    const chapter = await Chapter.findByPk(chapterId);
    const pages = await Page.findAll({ where: { chapterId } });

    const registeredPages = await fetchRegisteredPages(userId);

    res.render("pagelist", {
      messages: req.flash(),
      pageId,
      pages,
      userId,
      chapter,
      role,
      courseId,
      chapterId,
      chapterTitle: chapter.title,
      title: "Pagelist",
      csrfToken: req.csrfToken(),
      registeredPages,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error Occurred" });
  }
});


// markascompleted by chapters
// app.post("/markascompleted",  connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
//   try {
//     console.log("Received body:", req.body);
//     const { chapterId, courseId, userId } = req.body;
//     console.log("Received values:", userId, courseId, chapterId);

//     const existingEntry = await RegChapter.findOne({
//       where: {
//         chapterId: chapterId,
//         courseId: courseId,
//         userId: userId,
//       },
//     });

//     if (existingEntry) {
//       console.log("Chapter already marked as completed");
//       res.redirect(`/chapter-view?courseId=${courseId}`);
//       return;
//     } else {
//       await RegChapter.create({
//         userId: userId,
//         courseId: courseId,
//         chapterId: chapterId,
//         iscomplete: true,
//       });
//       console.log("New row created and marked as completed successfully");
//     }

//     res.redirect(`/chapter-view?courseId=${courseId}`);
//   } catch (error) {
//     console.error("Error:", error);
//     // Send an error response
//     res.status(500).send("Failed to mark chapter as completed");
//   }
// });
// calculation
app.get("/displayc", connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
  try {
    const allcourses = await Course.findAll();
    const chapters = await Chapter.findAll();
    const pages = await Page.findAll();
    const userRole = req.user.role;
    const userName = req.user.name;
    const userId = req.user.id;
    const currentUser = req.user.id;
    const enrolledCourses = await Register.findAll({ where: { userId } });

    const currentUserCourses = allcourses.filter((course) => {
      const matchingCourseIds = enrolledCourses.map(
        (enrolledCourse) => enrolledCourse.courseId
      );
      // test when not workin
      // console.log("Matching Course IDs:", matchingCourseIds);
      // console.log("Current Course ID:", course.id);
      return matchingCourseIds.includes(course.id);
    });
    const nonEnrolledCourses = allcourses.filter((course) => {
      return !enrolledCourses.some(
        (enrolledCourse) => enrolledCourse.courseId === course.id
      );
    });
    // test when not workingg
    // console.log("Enrolled Courses:", enrolledCourses);
    // console.log("Current User Courses:", currentUserCourses);

    res.render("displayc", {
      messages: req.flash(),
      currentUserCourses: currentUserCourses,
      chapters,
      courses: nonEnrolledCourses,
      allcourses,
      courseId: req.query.courseId,
      enrolledCourses,
      userRole,
      userId,
      pages,
      csrfToken: req.csrfToken(),
      userName,
      currentUser,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json;
  }
});
// commented it for page wise progress
// app.get('/progress/:id',  connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
//     try {
//       const courseId = req.params.id;
//       console.log('Course ID:', courseId);
//       const chapters = await Chapter.findAll({
//           where: {
//               courseId: courseId,
//           },
//       });

//       const chapterCount = chapters.length;
//       const completedChapters = await RegChapter.count({
//           where: {
//               courseId: courseId,
//               iscomplete: true,
//           },
//       });
//       const totalpercentage = (completedChapters / chapterCount) * 100;

//       const completedChapterIds = (await RegChapter.findAll({
//         attributes: ['chapterId'],
//         where: {
//             courseId: courseId,
//             iscomplete: true,
//         },
//     })).map(chapter => chapter.chapterId);

//     res.render('progress', {
//         courseId: courseId,
//         chapterCount: chapterCount,
//         completedChapters: completedChapters,
//         totalpercentage: totalpercentage,
//         chapters: chapters,
//         completedChapterIds: completedChapterIds,
//     });
//   } catch (error) {
//       console.error('Error:', error);
//       res.status(500).send('Failed');
//   }
// });


// Define the route to show the progress page
app.get('/progress/:courseId', connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const userId = req.user.id;
    const course = await Course.findOne({
      where: {
        id: courseId,
      },
    });
    const coursename = course.title;
    const allPages = await Page.findAll({
      where: {
        courseId: courseId,
      },
    });

    const completedPages = await Regpages.findAll({
      where: {
        userId: userId,
        courseId: courseId,
        iscomplete: true,
      },
    });

    const pagesCount = allPages.length;
    const completedPagesCount = completedPages.length;

    const completionPercentage = (completedPagesCount / pagesCount) * 100;

    res.render('progress', {
      title: 'Course Progress',
      courseId: courseId,
      coursename,
      csrfToken: req.csrfToken(),
      pagesCount: pagesCount,
      completedPagesCount: completedPagesCount,
      completionPercentage: completionPercentage,
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Failed to retrieve course progress');
  }
});


// teacherside

app.get('/report', connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
  try {
    const educatorCourses = await Course.findAll({ where: { userId: req.user.id } });

    if (educatorCourses.length === 0) {
      res.render('report', {
        educatorCourses: [],
        csrfToken: req.csrfToken(),
        courseId: req.query.courseId,
        noCoursesFound: true,
      });
      return;
    }

    const coursesWithEnrollmentCount = await Promise.all(
      educatorCourses.map(async (course) => {
        const enrollmentCount = await Register.count({ where: { courseId: course.id } });
        return { course, enrollmentCount };
      })
    );

    const sortedCourses = coursesWithEnrollmentCount.sort((a, b) => b.enrollmentCount - a.enrollmentCount);

    if (!sortedCourses[0]) {
      res.render('report', {
        educatorCourses: [],
        csrfToken: req.csrfToken(),
        courseId: req.query.courseId,
        noCoursesFound: true,
      });
      return;
    }

    const maxEnrollmentCount = sortedCourses[0].enrollmentCount;
    const coursesWithPopularity = sortedCourses.map((item) => ({
      ...item,
      popularityScore: (item.enrollmentCount / maxEnrollmentCount) * 100,
    }));

    res.render('report', {
      educatorCourses: coursesWithPopularity,
      csrfToken: req.csrfToken(),
      courseId: req.query.courseId,
    });
  } catch (error) {
    console.error('Error:', error);
    req.flash('error', 'An error occurred while fetching courses');
    res.redirect('/adminhome');
  }
});

// mark chapter as completed by pages

app.post('/markascompleted', connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
  try {

    const { courseId, chapterId, pageId } = req.body;
    const userId = req.user.id;
    console.log('Received body:', req.body);
    console.log('Received values:', userId, courseId, pageId);
    if (!pageId) {
      return res.status(400).json({ error: 'Invalid pageId' });
    }

    const existingEntry = await Regpages.findOne({
      where: {
        pageId: pageId,
        courseId: courseId,
        userId: userId,
      },
    });

    if (existingEntry) {
      console.log('Page already marked as completed');
      res.redirect(`/pagelist?chapterId=${chapterId}&courseId=${courseId}`);
      return;
    } else {
      await Regpages.create({
        userId: userId,
        courseId: courseId,
        pageId: pageId,
        chapterId: chapterId,
        iscomplete: true,
      });
      console.log('New row created and marked as completed');
    }

    res.redirect(`/pagelist?chapterId=${chapterId}&courseId=${courseId}`);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Failed to mark as completed');
  }
});


// !------------------------END-----------------------------------!
// all are formated by prettier

module.exports = app;
