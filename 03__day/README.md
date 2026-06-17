# Day 03 - Legacy Web Application 

## Overview


The application is a legacy static website built using:

* HTML
* CSS
* JavaScript
* Images and static assets

Rather than starting with a modern application, this project intentionally uses an older codebase to simulate real-world environments where DevOps engineers often work with legacy systems.

The objective is to introduce DevOps practices while identifying and managing issues that already exist within the application.

---

## Project Goals

* Containerize a legacy web application using Docker
* Implement CI/CD pipelines
* Introduce automated quality checks
* Detect issues before deployment
* Simulate production troubleshooting scenarios
* Document findings and remediation steps

---

## Current Status

### Dockerization

The application has been containerized using Nginx and can be built and deployed through Docker.

Example:

```bash
docker build -t company-website .
docker run -d -p 8080:80 company-website
```

---

### HTML Validation

HTML validation was introduced using HTMLHint.

```bash
npx htmlhint "*.html"
```

The validation process identified several issues in the legacy codebase.

---

## Issues Detected

### 1. Attribute Quote Style

Example:

```html
<link href='https://fonts.googleapis.com/css?family=Lato:400,300,700' rel='stylesheet'>
```

HTMLHint expects double quotes:

```html
<link href="https://fonts.googleapis.com/css?family=Lato:400,300,700" rel="stylesheet">
```

---

### 2. Missing Closing List Tags

Example:

```html
<li><a href="company_aboutus.html">About Us</a>
```

Expected:

```html
<li><a href="company_aboutus.html">About Us</a></li>
```

---

### 3. Missing Closing Div Tags

Example:

```html
<div class="btm1">
```

HTMLHint reports that the corresponding closing tag is missing.

---

### 4. Missing Title Tag

File:

```text
header.html
```

Issue:

```html
<head>
...
</head>
```

Expected:

```html
<head>
    <title>Website Title</title>
</head>
```

---

## Why These Errors Matter

These issues demonstrate how automated validation tools can uncover hidden problems in legacy applications before they reach production.

Benefits include:

* Improved code quality
* Faster troubleshooting
* Reduced deployment risk
* Better maintainability
* Early detection through CI pipelines

---

## Lessons Learned

This exercise highlights an important DevOps principle:

> Automate detection before automating deployment.

Before implementing advanced CI/CD workflows, it is important to understand the current health of the application and identify existing technical debt.

Even a simple static website can benefit from:

* Automated validation
* Containerization
* Repeatable deployments
* Continuous integration

---

## Next Steps

Planned improvements:

* Configure GitHub Actions CI pipeline
* Automate HTML validation during pull requests
* Add Docker image scanning
* Implement deployment automation
* Create monitoring and alerting workflows
* Simulate additional production incidents

---

## Project Structure

```text
html-web-app/
├── css/
├── images/
├── js/
├── nginx/
│   └── default.conf
├── Dockerfile
├── .dockerignore
├── index.html
├── header.html
└── README.md
```

---

## Commands Used

Build Docker image:

```bash
docker build -t company-website .
```

Run container:

```bash
docker run -d -p 8080:80 company-website
```

Validate HTML:

```bash
npx htmlhint "*.html"
```

---

## Key Takeaway

This project demonstrates how DevOps practices can be introduced into a legacy application environment. The initial focus is not on fixing every issue immediately, but on building visibility through automation and identifying problems early in the software delivery lifecycle.
 Web app
