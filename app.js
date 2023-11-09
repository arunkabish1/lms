const express = require("express");
var csrf = require("tiny-csrf");
const app = express();
const bodyParser = require("body-parser");
var cookieParser = require("cookie-parser");
const path = require("path");
const { Course, Chapter, Page, User,register } = require("./models");
const flash = require("connect-flash");
const jsonParser = express.json()
app.set("views", path.join(__dirname, "views"));

const passport = require("passport");
var connectEnsureLogin = require("connect-ensure-login");
var session = require("express-session");
const LocalStrategy = require("passport-local");
const bcrypt = require("bcrypt");

const saltRounds = 10;
app.use(flash());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser("shh! some secret string"));
app.use(csrf("this_should_be_32_character_long", ["POST", "PUT", "DELETE"]));
app.use(express.static(path.join(__dirname, "/public")));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(
  session({
    secret: "my-super-secret-key-21212121212121212",
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
    },
    resave: false,
    saveUninitialized: false,
  }),
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
            message: "This email is not registered",
          });
        });
    },
  ),
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
  },
);

// Create a new chapter
app.get(
  "/create-chapter",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    const courseId = req.query.courseId;
    const chapters = await Chapter.findAll({ where: { courseId } });

    if (!courseId) {
      return res.status(400).json({ error: "Course ID is missing" });
    }

    res.render("create-chapter", {
      courseId,
      messages: req.flash(),
      chapters,
      title: "Create Chapter",
      csrfToken: req.csrfToken(),
    });
  },
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
      });
      req.flash("success", "Chapter created successfully");
      res.redirect(`/create-chapter?courseId=${courseId}`);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Error Occured" });
    }
  },
);

// Display pages
app.get("/pages", connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
  try {
    const chapterId = req.query.chapterId;

    const chapter = await Chapter.findByPk(chapterId);
    const pages = await Page.findAll({ where: { chapterId } });
    const userRole = req.user.role;
    const userId = req.user.id;

    if (!chapter) {
      return res.status(404).json({ error: "Chapter not found" });
    }

    res.render("pages", {
      chapterId,
      userRole,
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

      if (!chapter) {
        return res.status(404).json({ error: "Chapter not found" });
      }

      res.render("create-page", {
        chapters,
        messages: req.flash(),
        chapterId,
        chapterTitle: chapter.title,
        pages,
        title: "Create Page",
        csrfToken: req.csrfToken(),
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Error Occured" });
    }
  },
);

app.post(
  "/create-page",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    try {
      const { title, content, chapterId } = req.body;

      if (!chapterId) {
        return res.status(400).json({ error: "Chapter ID is missing" });
      }

      await Page.create({
        title: title,
        content: content,
        chapterId: chapterId,
      });
      req.flash("success", "You created the Page successfully");
      res.redirect(`/pages?chapterId=${chapterId}`);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Error Occured" });
    }
  },
);

// Display courses,chapters,and pages
app.get("/display", connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
  try {
    const courses = await Course.findAll();
    const chapters = await Chapter.findAll();
    const pages = await Page.findAll();
    const courseId = req.body.courseId;
    const userRole = req.query.role;
    const nonEnrolledCourses = allcourses.filter(course => {
      return !enrolledCourses.some(enrolledCourse => enrolledCourse.courseId === course.id);
    });
    res.render("display", {
      courses: nonEnrolledCourses,
      chapters,
      pages,
      title: "Display",
      csrfToken: req.csrfToken(),
      userRole,
      courseId 
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
        description,
        educator,
        chapters,
        title: "Chapter View",
        csrfToken: req.csrfToken(),
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Error Occured" });
    }
  },
);
app.get(
  "/adminpages",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    const chapterId = req.query.chapterId;
    try {
      const chapter = await Chapter.findByPk(chapterId);

      const pages = await Page.findAll({ where: { chapterId } });
      const pageTitle = Page.title;
      const pageContent = Page.content;
      const chapterTitle = chapter.title;
      const pageId = Page.id;
      res.render("adminpages", {
        messages: req.flash(),
        pageId,
        pages,
        chapter,
        chapterId,
        chapterTitle,
        pageTitle,
        pageContent,
        title: "Admin Pages",
        csrfToken: req.csrfToken(),
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Error Occured" });
    }
  },
);

// studenthome
app.get("/studenthome", connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
  try {
    
    const allcourses = await Course.findAll();
    const chapters = await Chapter.findAll();
    const pages = await Page.findAll();
    const userRole = req.user.role;
    const userName = req.user.name;
    const userId = req.user.id;
    const currentUser = req.user.id;
    const enrolledCourses = await register.findAll({ where: { userId } });

    const currentUserCourses = allcourses.filter(course => {
      const matchingCourseIds = enrolledCourses.map(enrolledCourse => enrolledCourse.courseId);
      // test when not workin
      // console.log("Matching Course IDs:", matchingCourseIds);
      // console.log("Current Course ID:", course.id);
      return matchingCourseIds.includes(course.id);
    });
    const nonEnrolledCourses = allcourses.filter(course => {
      return !enrolledCourses.some(enrolledCourse => enrolledCourse.courseId === course.id);
    });
    // test when not workingg
    // console.log("Enrolled Courses:", enrolledCourses);
    // console.log("Current User Courses:", currentUserCourses);


    res.render("studenthome", {
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
      title: "Student Home",
      csrfToken: req.csrfToken(),
      userName,
      currentUser,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json
  }
});
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
  if (req.body.email.length == 0) {
    req.flash("error", "Email can not be empty!");
    return res.redirect("/signup");
  }

  if (req.body.name.length == 0) {
    req.flash("error", "Name must be filled!");
    return res.redirect("/signup");
  }
  if (req.body.password.length <= 8) {
    req.flash(
      "error",
      "password is not strong as it is less than 8 characters",
    );
    return res.redirect("/signup");
  }
  const hashedPassword = await bcrypt.hash(req.body.password, saltRounds);
  console.log(hashedPassword);

  console.log("name", req.body.name);
  console.log("email", req.body.email);
  console.log("password", req.body.password);
  console.log("role", req.body.role);
  try {
    const user = await User.create({
      name: req.body.name,
      email: req.body.email,
      password: hashedPassword,
      role: req.body.role,
    });
    req.login(user, (err) => {
      if (err) {
        console.log(err);
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
  },
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
  },
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
  },
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

      // Check if the user is enrolled in the course
      const isEnrolled = await register.findOne({ where: { userId, courseId } });

      if (isEnrolled) {
        // User is enrolled, render chapter-view
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
        // User is not enrolled, render course-view
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
        })
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Error Occurred" });
    }
  },
);

// chamnge password
app.get("/changepass", connectEnsureLogin.ensureLoggedIn(), (req, res) => {
  const userId = req.user.id;
  res.render("changepass", {
    userId,
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
  },
);
// after initial submission
// enroll
app.get('/enroll/:id', connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
  res.render('enroll', {
    title: 'Enroll',
    messages: req.flash(),
    csrfToken: req.csrfToken(),
    userId: req.user.id,
    courseId: req.query.courseId,
  })
})
app.post('/enroll/:id', connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
  try {
    console.log('Enroll route hit in internal');
    console.log('Req body:', req.body);
    const courseId  = req.params.id;
    const userId = req.user.id;
    await register.create({ userId, courseId });
    req.flash('success', 'Enrolled in the course successfully');
    res.redirect(`/chapter-view?courseId=${courseId}`);
    }catch (error) {
    console.error(error);
    }
  })

  
// ext enroll
app.get('/extenroll/:id', connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
  res.render('extenroll', {
    title: 'Enroll',
    messages: req.flash(),
    csrfToken: req.csrfToken(),
    userId: req.user.id,
    courseId: req.query.courseId,
  })
})

app.post('/extenroll/:id', connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
  try {
    console.log('Enroll route in Outer');
    console.log('Req body:', req.body);
    const courseId  = req.params.id;
    const userId = req.user.id;
    await register.create({ userId, courseId });

    res.redirect(`/chapter-view?courseId=${courseId}`);
  } catch (error) {
    console.error(error);

  }
})


//register route for already register
app.get('/check-enroll', connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
  try {
    const userId = req.user.id;
    const courseId = req.query.courseId;
    const registration = await register.findOne({ where: { userId, courseId } });
    res.json({ enrolled: !!registration });
  } catch (error) {
    console.error('Error checking enrollment:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// report for student


module.exports = app;
