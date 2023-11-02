const express = require("express");
var csrf = require("tiny-csrf");
const app = express();
const bodyParser = require("body-parser");
var cookieParser = require("cookie-parser");
const path = require("path");
const { Course, Chapter, Page , User } = require("./models");
const flash = require("connect-flash");

app.set("views", path.join(__dirname, "views"));

const passport = require("passport");
var connectEnsureLogin=require("connect-ensure-login");
const session = require("express-session");
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


app.use(session({
  secret: "my-super-secret-key-21212121212121212",
  cookie: {
    maxAge: 24 * 60 * 60 * 1000
  }
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(
  {
    usernameField: "email",
    passwordField: "password"
 },(username, password, done) => {
    User.findOne({ where: { email: username } })
      .then(async user => {
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
  }));
  

passport.serializeUser(
  (user, done) => {
    console.log("serializing user", user.id);
    done(null, user.id);
  }
);

passport.deserializeUser(
  (id, done) => {
    User.findByPk(id)
      .then(user => {
        done(null, user);
      })
      .catch(err => {
        done(err, null);
      });
  }
);



app.get("/", (req, res) => {
  res.render("index");
});

app.get("/index", (req, res) => {
  csrfToken = req.csrfToken();
  res.render("index");
});
//adminhome
app.get("/adminhome", connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
  try {
    const courses = await Course.findAll();
    const chapters = await Chapter.findAll();
    const pages = await Page.findAll();
    const userRole = req.user.role;
    res.render("adminhome", { userRole, courses, educator: req.user.name, chapters, pages, title: "Admin Home", csrfToken: req.csrfToken() });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error Occured" });
  }
});
// create course
app.get("/create-course",connectEnsureLogin.ensureLoggedIn(), (req, res) => {
  res.render("create-course",{title:"Create Course", messages: req.flash(),csrfToken:req.csrfToken()});
});

app.post("/create-course",connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
  try {
    const { title, description } = req.body;
    const courseTitle = typeof title === "string" ? title : title.toString();
    const course = await Course.create({
      title: courseTitle,
      description: description,
      userId: req.user.id,
      educator: req.user.name
    });
    req.flash("success", "Course created successfully");
     return res.redirect(`/create-chapter?courseId=${course.id}`);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error Occured" });
  }
});

// Create a new chapter
app.get("/create-chapter",connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
  const courseId = req.query.courseId;
  const chapters = await Chapter.findAll({ where: { courseId } });
  
  if (!courseId) {
    return res.status(400).json({ error: "Course ID is missing" });
  }

  res.render("create-chapter", { courseId, messages: req.flash(),chapters,title:"Create Chapter",csrfToken:req.csrfToken() });
});
// POST to create a new chapter
app.post("/create-chapter",connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
  try {
    const { title, description, courseId } = req.body;

    if (!courseId) {
      return res.status(400).json({ error: "Course ID is missing" });
    }

    const chapter = await Chapter.create({
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
});

// Display pages
app.get("/pages",connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
  try {
    const chapterId = req.query.chapterId;

    const chapter = await Chapter.findByPk(chapterId);
    const pages = await Page.findAll({ where: { chapterId } });
    const userRole = req.user.role;

    if (!chapter) {
      return res.status(404).json({ error: "Chapter not found" });
    }

    res.render("pages", { chapterId,userRole, chapterTitle: chapter.title, pages,title:"Pages",csrfToken:req.csrfToken() });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error Occured" });
  }
});

// Create a display page
app.post("/pages",connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
  try {
    const { title, content, chapterId } = req.body;

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
app.get("/create-page",connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
  try {
    const chapterId = req.query.chapterId;
    const chapters = await Chapter.findAll();
    const chapter = await Chapter.findByPk(chapterId);
    const pages = await Page.findAll({ where: { chapterId } });

    if (!chapter) {
      return res.status(404).json({ error: "Chapter not found" });
    }

    res.render("create-page", { chapters, messages: req.flash(), chapterId, chapterTitle: chapter.title, pages,title:"Create Page",csrfToken:req.csrfToken() });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error Occured" });
  }
});

app.post("/create-page",connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
  try {
    const { title, content, chapterId } = req.body;
    
    if (!chapterId) {
      
      return res.status(400).json({ error: "Chapter ID is missing" });
    }

    const page = await Page.create({
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
});

// Display courses,chapters,and pages
app.get("/display",connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
  try {
    const courses = await Course.findAll();
    const chapters = await Chapter.findAll();
    const pages = await Page.findAll();

    const userRole = req.body.role;
    res.render("display", { courses, chapters, pages, title: "Display", csrfToken: req.csrfToken(), userRole });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error Occurred" });
  }
});


// view chapter when clicked
app.get("/chapter-view", connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
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
    res.render("chapter-view", { course, courseTitle,description, educator, chapters, title: "Chapter View", csrfToken: req.csrfToken() });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error Occured" });
  }
});
app.get("/adminpages",connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
  const chapterId = req.query.chapterId;
  try{
    const chapter = await Chapter.findByPk(chapterId);
  
  const pages = await Page.findAll({ where: { chapterId } });
  const pageTitle = Page.title;
  const pageContent = Page.content
  const chapterTitle = chapter.title
  const pageId = Page.id
  res.render("adminpages", {pageId, pages,chapter, chapterId,chapterTitle, pageTitle, pageContent, title: "Admin Pages", csrfToken: req.csrfToken() });
  }catch(error){
    console.error(error);
    return res.status(500).json({ error: "Error Occured" });
  }
});

// studenthome
app.get("/studenthome", connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
  try {
    const courses = await Course.findAll();
    const chapters = await Chapter.findAll();
    const pages = await Page.findAll();
    const userRole = req.user.role; // Change "req.body.role" to "req.user.role"
    res.render("studenthome", { courses, chapters, userRole, pages, title: "Student Home", csrfToken: req.csrfToken() });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error Occured" });
  }
});


// signup page
app.get("/signup", (req, res) => {
  res.render("signup", { title: "Sign Up", messages: req.flash(),csrfToken: req.csrfToken() });
});

// create user
app.get("/users", (req, res) => {
  res.render("users", { title: "Users", messages: req.flash(),csrfToken: req.csrfToken() });
  
})
app.post("/users",async (req, res) => {
  if (req.body.email.length == 0) {
    req.flash("error", "Email can not be empty!");
    return res.redirect("/signup");
  }

  if (req.body.firstName.length == 0) {
    req.flash("error", "Firstname must be filled!");
    return res.redirect("/signup");
  }
  if (req.body.password.length <= 8) {
    req.flash("error", "password is not strong as it is less than 8 characters");
    return res.redirect("/signup");
  }
  const hashedPassword = await bcrypt.hash(req.body.password, saltRounds);
  console.log(hashedPassword);

  console.log("name",req.body.name);
  console.log("email",req.body.email);
  console.log("password",req.body.password);
  console.log("role",req.body.role);
  try{
    const user = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: hashedPassword,
    role: req.body.role
  });
  req.login(user, (err) => {
    if (err){
      console.log(err);
      res.redirect("/signup");
    }
    if (req.body.role === "student") {
      req.flash("success", "Student Account created successfully");
      res.redirect("/studenthome");
    }else{
      req.flash("success", "Admin Account created successfully");
      res.redirect("/adminhome");
    }
  })
  }catch(error){
    console.error(error);
  }
})

// login and session
app.get("/login", (req, res) => {
  res.render("login", { title: "Login", messages: req.flash(),csrfToken: req.csrfToken() });
})

app.post("/login",passport.authenticate("local", { failureRedirect: "/login" }), (req, res) => {
  console.log(req.user);
    if (req.user.role === req.body.role) {
      if (req.body.role === "student") {
        req.flash("success", "Student logged in successfully");
        res.redirect("/studenthome");
      }else{
        req.flash("success", "Admin logged in successfully");
        res.redirect("/adminhome");
      }
  }else{
    res.redirect("/login");
  }
})
app.get("/session", (req, res) => {
  res.render("session", { title: "Login", messages: req.flash(),csrfToken: req.csrfToken() });
})
app.post("/session",passport.authenticate("local", { failureRedirect: "/login" }), (req, res) => {
  console.log(req.user);
    if (req.user.role === req.body.role) {
      if (req.body.role === "student") {
        req.flash("success", "Student logged in successfully");
        res.redirect("/studenthome");
      }else{
        req.flash("success", "Admin logged in successfully");
        res.redirect("/adminhome");
      }
  }else{
    res.redirect("/login");

  }
})

// signout page
app.get("/signout",connectEnsureLogin.ensureLoggedIn(), (req, res, next) => {
  req.logout((err) => {
     if (err){
      return next(err);}
    res.redirect("/login");
  });
});

app.get("/admincourses",connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
  try {
    const userId = req.user.id;
    const admincourses = await Course.findAll({
      where: { userId },
    });
    const chapters = await Chapter.findAll();
    const pages = await Page.findAll();

    res.render("admincourses", {admincourses,chapters,pages,title: "Admin Courses",csrfToken: req.csrfToken(),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error Occurred" });
  }
});

app.get("/studentdisplay",connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
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
    res.render("studentdisplay", { course, courseTitle, description, educator, chapters, title: "Chapter View", csrfToken: req.csrfToken() });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error Occured" });
  }
});


module.exports = app;
