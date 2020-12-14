/*Function to show login form*/
const showLogin = () => {
    const mainEl = document.getElementById("adminMain");
    mainEl.innerHTML = "";
    mainEl.innerHTML = '<form id="adminPass"  onSubmit = "login()">' +
        '<label> Lösen : </label >' +
        '<input type="password" placeholder="Lösen" name="password" required>' +
        '<button type="submit">Login</button>' +
        '</form>'
}
/**
 * function to delete one slected course
 * makes fetch call to rest_courses.php 
 * @param {*} uni 
 * @param {*} name 
 */
const deleteCourse = (uni, name) => {
    console.log("deleting: " + uni + " " + name);
    /*make fetch delete*/
    const data = {
        university: uni,
        course_name: name,
        email: "cristina.lofqvist@gmail.com"
    }
    fetch('http://localhost:8080/DT173G_project/API/rest_courses.php', {
        method: 'DELETE',
        body: JSON.stringify(data)
    })
        .then(response => response.json())
        .then(data => {

        })
        .catch(error => {
            console.log('Error: ', error);
        })
    location.reload();
}

/**
 * Function to delete xp
 * makes fetch call to rest_xp.php
 * @param {*} workplace 
 * @param {*} position 
 */
const deleteXp = (workplace, position) => {
    console.log("deleting: " + workplace + " " + position);
    /*make fetch delete*/
    const data = {
        workplace: workplace,
        position: position,
        email: "cristina.lofqvist@gmail.com"
    }
    fetch('http://localhost:8080/DT173G_project/API/rest_xp.php', {
        method: 'DELETE',
        body: JSON.stringify(data)
    })
        .then(response => response.json())
        .then(data => {
        })
        .catch(error => {
            console.log('Error: ', error);
        })
    location.reload();

}
/**
 * Function to delete webpage
 * makes fetch call to rest_wp.php
 * @param {*} title 
 * @param {*} url 
 */
const deleteWp = (title, url) => {
    console.log("deleting: " + title + " " + url);
    /*make fetch delete*/
    const data = {
        title: title,
        url: url,
        email: "cristina.lofqvist@gmail.com"
    }
    fetch('http://localhost:8080/DT173G_project/API/rest_wp.php', {
        method: 'DELETE',
        body: JSON.stringify(data)
    })
        .then(response => response.json())
        .then(data => {
        })
        .catch(error => {
            console.log('Error: ', error);
        })
    location.reload();

}
/**
 * Function to update an experience 
 * makes fetch call to rest_xp.php
 */
const updateXp = () => {

    var x = document.getElementById("xpupdate");
    const data = {
        workplace: x.elements[0].value,
        position: x.elements[1].value,
        new_position: x.elements[2].value,
        new_workplace: x.elements[3].value,
        new_start_date: x.elements[4].value,
        new_end_date: x.elements[5].value,
        email: "cristina.lofqvist@gmail.com"
    }
    fetch('http://localhost:8080/DT173G_project/API/rest_xp.php', {
        method: "PUT",
        body: JSON.stringify(data),
        headers: {
            "Content-type": "application/json; charset=UTF-8"
        }
    })
        .then(response => response.json())
        .then(data => {
            console.log(data)
            //getCourses();
        })
        .catch(error => {
            console.log('Error: ', error);
        })

}
/**
 * Function to update a webpage
 * makes fetch call to rest_wp.php
 */
const updateWp = () => {

    var x = document.getElementById("wpupdate");
    const data = {
        title: x.elements[0].value,
        url: x.elements[1].value,
        new_title: x.elements[2].value,
        new_url: x.elements[3].value,
        new_description: x.elements[4].value,
        email: "cristina.lofqvist@gmail.com"
    }
    fetch('http://localhost:8080/DT173G_project/API/rest_wp.php', {
        method: "PUT",
        body: JSON.stringify(data),
        headers: {
            "Content-type": "application/json; charset=UTF-8"
        }
    })
        .then(response => response.json())
        .then(data => {
            console.log(data)
            //getCourses();
        })
        .catch(error => {
            console.log('Error: ', error);
        })

}
/**
 * function to Add an experience
 * makes fetch call to rest_xp.php
 */
const addXp = () => {

    var x = document.getElementById("xpAdd");
    const data = {
        workplace: x.elements[0].value,
        position: x.elements[1].value,
        start_date: x.elements[2].value,
        end_date: x.elements[3].value,
        email: "cristina.lofqvist@gmail.com"
    }
    fetch('http://localhost:8080/DT173G_project/API/rest_xp.php', {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
            "Content-type": "application/json; charset=UTF-8"
        }
    })
        .then(response => response.json())
        .then(data => {
            console.log(data)
            //getCourses();
        })
        .catch(error => {
            console.log('Error: ', error);
        })

}
/**
 * Function to add webpage
 * makes fetch call to rest_wp.php
 */
const addWp = () => {

    var x = document.getElementById("wpAdd");
    const data = {
        title: x.elements[0].value,
        url: x.elements[1].value,
        description: x.elements[2].value,
        email: "cristina.lofqvist@gmail.com"
    }
    fetch('http://localhost:8080/DT173G_project/API/rest_wp.php', {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
            "Content-type": "application/json; charset=UTF-8"
        }
    })
        .then(response => response.json())
        .then(data => {
            console.log(data)
            //getCourses();
        })
        .catch(error => {
            console.log('Error: ', error);
        })

}
/**
 * function to update a course
 * makes fetch call to rest_course.php
 */
const updateCourse = () => {

    var x = document.getElementById("courseupdate");
    const data = {
        course_name: x.elements[0].value,
        university: x.elements[1].value,
        new_course_name: x.elements[2].value,
        new_university: x.elements[3].value,
        new_start_date: x.elements[4].value,
        new_end_date: x.elements[5].value,
        email: "cristina.lofqvist@gmail.com"
    }
    fetch('http://localhost:8080/DT173G_project/API/rest_courses.php', {
        method: "PUT",
        body: JSON.stringify(data),
        headers: {
            "Content-type": "application/json; charset=UTF-8"
        }
    })
        .then(response => response.json())
        .then(data => {
            console.log(data)
            //getCourses();
        })
        .catch(error => {
            console.log('Error: ', error);
        })

}
/**
 * function to add course
 * makes fetch call to rest_courses.php
 */
const addCourse = () => {

    var x = document.getElementById("courseAdd");
    const data = {
        course_name: x.elements[0].value,
        university: x.elements[1].value,
        start_date: x.elements[2].value,
        end_date: x.elements[3].value,
        email: "cristina.lofqvist@gmail.com"
    }
    fetch('http://localhost:8080/DT173G_project/API/rest_courses.php', {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
            "Content-type": "application/json; charset=UTF-8"
        }
    })
        .then(response => response.json())
        .then(data => {
            console.log(data)
            //getCourses();
        })
        .catch(error => {
            console.log('Error: ', error);
        })

}
/**
 * Function to get all webpages  from the database
 * makes fetch call ot rest_wp.php
 */
const getWp = () => {

    const headerEl = document.getElementById("adminHeader");
    const wpEl = document.createElement("DIV")
    wpEl.innerHTML = ''; /*empty value*/
    fetch('http://localhost:8080/DT173G_project/API/rest_wp.php') /*make fetch*/
        .then(response => response.json())
        .then(data => {
            console.log(data)
            if (data.message === "No webpages found") { //check if this is correct
                return
            }
            data.forEach(wp => {
                /** parse json here */
                wpEl.innerHTML +=
                    `
                <div class = "course">
                <p>
                <b>Webplatser</b>
                <b>Titel:</b> ${wp.title}
                <b>Beskrivning: </b> ${wp.desc}
                <b>URL: </b> ${wp.url}
                `+ "<span onClick='deleteWp(" + '"' + `${wp.title}` + '"' + "," + '"' + `${wp.url}` + '"' + ")'> Ta bort </span>" +
                    "</p></div>"

            })
        })
    headerEl.appendChild(wpEl)

}

/**
 * function to get all experiences in database
 * makes fetch call to rest_xp.php
 */
const getXp = () => {

    const headerEl = document.getElementById("adminHeader");
    const xpEl = document.createElement("DIV")
    xpEl.innerHTML = ''; /*empty value*/
    fetch('http://localhost:8080/DT173G_project/API/rest_xp.php') /*make fetch*/
        .then(response => response.json())
        .then(data => {
            console.log(data)
            if (data.message === "No experience found") { //check if this is correct
                return
            }
            data.forEach(xp => {
                /** parse json here */
                xpEl.innerHTML +=
                    `
                <div class = "course">
                <p>
                <b>Erfarenhet</b>
                <b>Arbetsplats:</b> ${xp.work_place}
                <b>Position: </b> ${xp.position}
                <b>Start datum: </b> ${xp.start_date}
                <b>Slut datum: </b> ${xp.end_date}
                `+ "<span onClick='deleteXp(" + '"' + `${xp.work_place}` + '"' + "," + '"' + `${xp.position}` + '"' + ")'> Ta bort </span>" +
                    "</p></div>"

            })
        })
    headerEl.appendChild(xpEl)
}

/**
 * function to get all courses from database
 * makes fetch call to rest_courses.php
 */
const getCourses = () => {

    const headerEl = document.getElementById("adminHeader");
    const coursesEl = document.createElement("DIV")
    coursesEl.innerHTML = ''; /*empty value*/
    fetch('http://localhost:8080/DT173G_project/API/rest_courses.php') /*make fetch*/
        .then(response => response.json())
        .then(data => {
            console.log(data)
            if (data.message === "No courses found") {
                return
            }
            data.forEach(course => {
                /** parse json here */
                coursesEl.innerHTML +=
                    `
                <div class = "course">
                <p>
                <b>Kurs</b>
                <b>Universitet:</b> ${course.university}
                <b>Namn: </b> ${course.course_name}
                <b>Start datum: </b> ${course.start_date}
                <b>Slut datum: </b> ${course.end_date}
                `+ "<span onClick='deleteCourse(" + '"' + `${course.university}` + '"' + "," + '"' + `${course.course_name}` + '"' + ")'> Ta bort </span>" +
                    "</p></div>"

            })
        })
    headerEl.appendChild(coursesEl)

}

/**
 * Function to render admin form if user is authorixed
 * makes fetch call to rest_authoruzed.php
 */
const showAdmin = () => {
    const data = {
        email: "cristina.lofqvist@gmail.com"
    }
    fetch('http://localhost:8080/DT173G_project/API/rest_authorized.php', {
        method: 'POST',
        body: JSON.stringify(data)
    }) /*make fetch*/
        .then(response => {
            if (!response.ok) {
                showLogin();
            } else {


                const mainEl = document.getElementById("adminMain");
                mainEl.innerHTML = "";
                mainEl.innerHTML = '<form id="courseAdd" onSubmit = "addCourse()">' +
                    '<label for="kursname">Kursnamn:</label>' +
                    '<input type="text" name="kursnamn" id="kursnamn">' +
                    '<label for="university">Universitet:</label>' +
                    '<input type="text" name="university" id="uni">' +
                    '<label for="start_date">Startdatum:</label>' +
                    '<input type="date" name="start_date" id="sdate">' +
                    '<label for="end_date">Slutdatum:</label>' +
                    '<input type="date" name="end_date" id="edate">' +
                    '<button type="submit">Lägg till kurs</button>' +
                    '</form>' + "<hr/>" +
                    '<form id="xpAdd"  onSubmit = "addXp()">' +
                    '<label for="workplace">Workplace:</label>' +
                    '<input type="text" name="workplace" id="workplace">' +
                    '<label for="title">Title:</label>' +
                    '<input type="text" name="title" id="title">' +
                    '<label for="start_date">Startdatum:</label>' +
                    '<input type="date" name="start_date" id="sdate">' +
                    '<label for="end_date">Slutdatum:</label>' +
                    '<input type="date" name="end_date" id="edate">' +
                    '<button type="submit">Lägg till erfarenhet</button>' +
                    '</form>' + "<hr/>" +
                    '<form  id="wpAdd"  onSubmit = "addWp()">' +
                    '<label for="title">Title:</label>' +
                    '<input type="text" name="title" id="wpTitle">' +
                    '<label for="url">Url:</label>' +
                    '<input type="url" name="url" id="url">' +
                    '<label for="desc">Description:</label>' +
                    '<input type="text" name="desc" id="desc">' +
                    '<button type="submit">Lägg till webpage</button>' +
                    '</form>' + "<hr/>" +
                    '<form  id="courseupdate"  onSubmit = "updateCourse()">' +
                    '<label for="kursname">Kursnamn:</label>' +
                    '<input type="text" name="kursnamn" id="kursnamn">' +
                    '<label for="university">Universitet:</label>' +
                    '<input type="text" name="university" id="uni">' +
                    '<label for="kursname">nytt Kursnamn:</label>' +
                    '<input type="text" name="kursnamn" id="kursnamn">' +
                    '<label for="university">nytt Universitet:</label>' +
                    '<input type="text" name="university" id="uni">' +
                    '<label for="start_date">nytt Startdatum:</label>' +
                    '<input type="date" name="start_date" id="sdate">' +
                    '<label for="end_date">nytt Slutdatum:</label>' +
                    '<input type="date" name="end_date" id="edate">' +
                    '<button type="submit">Updatera</button>' +
                    '</form>' + "<hr/>" +
                    '<form  id="xpupdate"  onSubmit = "updateXp()">' +
                    '<label for="workplace">Workplace:</label>' +
                    '<input type="text" name="workplace" id="workplace">' +
                    '<label for="title">Title:</label>' +
                    '<input type="text" name="title" id="title">' +
                    '<label for="workplace">Ny Workplace:</label>' +
                    '<input type="text" name="workplace" id="workplace">' +
                    '<label for="title">Ny Title:</label>' +
                    '<input type="text" name="title" id="title">' +
                    '<label for="start_date">nytt Startdatum:</label>' +
                    '<input type="date" name="start_date" id="sdate">' +
                    '<label for="end_date">nytt Slutdatum:</label>' +
                    '<input type="date" name="end_date" id="edate">' +
                    '<button type="submit">Updatera</button>' +
                    '</form>' + "<hr/>" +
                    '<form  id="wpupdate"  onSubmit = "updateWp()">' +
                    '<label for="title">Title:</label>' +
                    '<input type="text" name="title" id="wpTitle">' +
                    '<label for="url">Url:</label>' +
                    '<input type="url" name="url" id="url">' +
                    '<label for="title">ny Title:</label>' +
                    '<input type="text" name="title" id="wpTitle">' +
                    '<label for="url">ny Url:</label>' +
                    '<input type="url" name="url" id="url">' +
                    '<label for="desc">ny Description:</label>' +
                    '<input type="text" name="desc" id="desc">' +
                    '<button type="submit">updatera</button>' +
                    '</form>'

                return response.json();
            }
        }).then((data) => {
        })
        .catch(error => {
            console.error('There has been a problem with your fetch operation:', error);
        });
    getCourses();
    getWp();
    getXp();

}

/**
 * Function to preform a login of user
 * calls fetch with url rest_login.php
 */
const login = () => {
    const x = document.getElementById("adminPass");
    const password = x.elements[0].value
    if (password) {
        const data = {
            email: "cristina.lofqvist@gmail.com",
            password: password
        }
        fetch('http://localhost:8080/DT173G_project/API/rest_login.php', {
            method: 'POST',
            body: JSON.stringify(data)
        }) /*make fetch*/
            .then(response => {
                if (!response.ok) {
                    showLogin();
                }
                return response.json();
            })
            .then(data => {
                if (data.message === "Login ok") {
                    showAdmin();
                }
            })
            .catch(error => {
                console.error('There has been a problem with your fetch operation:', error);
            });
    }
}

