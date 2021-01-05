




/*Function to show login form*/


const showLogin = () => {

    const mainEl = document.getElementById("adminMain");
    mainEl.innerHTML = "";
    mainEl.innerHTML = '<form id="adminPass"  onSubmit = "login()">' +
        '<label> Lösen : </label >' +
        '<input type="password" placeholder="Lösen" name="password" required>' +
        '<button onclick = "login()" type="button">Login</button>' +
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
    fetch('https://the-amazing-world-of-shell.se/API/rest_courses.php', {
        method: 'DELETE',
        body: JSON.stringify(data),
        headers: {
            "Content-type": "application/json; charset=UTF-8"
        }
    })
        .then(response => {
        })

        .then(data => {

            


        }).catch(() => {
            
        })

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
    fetch('https://the-amazing-world-of-shell.se/API/rest_xp.php', {
        method: 'DELETE',
        body: JSON.stringify(data),
        headers: {
            "Content-type": "application/json; charset=UTF-8"
        }
    })
        .then(response => {
        })
        .then(data => {
            
        }).catch(() => {
            
        })


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
    fetch('https://the-amazing-world-of-shell.se/API/rest_wp.php', {
        method: 'DELETE',
        body: JSON.stringify(data),
        headers: {
            "Content-type": "application/json; charset=UTF-8"
        }
    })
        .then(response => {
        })
        .then(data => {
            
        }).catch(() => {
            
        })


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
    fetch('https://the-amazing-world-of-shell.se/API/rest_xp.php', {
        method: "PUT",
        body: JSON.stringify(data),
        headers: {
            "Content-type": "application/json; charset=UTF-8"
        }
    })
        .then(response => response.json())
        .then(data => {
            
        }).catch(() => {
            
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
    fetch('https://the-amazing-world-of-shell.se/API/rest_wp.php', {
        method: "PUT",
        body: JSON.stringify(data),
        headers: {
            "Content-type": "application/json; charset=UTF-8"
        }
    })
        .then(response => response.json())
        .then(data => {
            //getCourses();
            
        }).catch(() => {
            
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
    fetch('https://the-amazing-world-of-shell.se/API/rest_xp.php', {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
            "Content-type": "application/json; charset=UTF-8"
        }
    })
        .then(response => response.json())
        .then(data => {
            //getCourses();
            
        }).catch(() => {
            
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
    fetch('https://the-amazing-world-of-shell.se/API/rest_wp.php', {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
            "Content-type": "application/json; charset=UTF-8"
        }
    })
        .then(response => response.json())
        .then(data => {
            //getCourses();
            
        }).catch(() => {
            
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
    fetch('https://the-amazing-world-of-shell.se/API/rest_courses.php', {
        method: "PUT",
        body: JSON.stringify(data),
        headers: {
            "Content-type": "application/json; charset=UTF-8"
        }
    })
        .then(response => response.json())
        .then(data => {
            //getCourses();
            
        }).catch(() => {
            
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
   fetch('https://the-amazing-world-of-shell.se/API/rest_courses.php', {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
            "Content-type": "application/json; charset=UTF-8"
        }
    })
        .then(response => response.json())
        .then(data => {
            //getCourses();
            
        }).catch(() => {
            
        })

}
/**
 * Function to reload page
 */
const reload = () => {
    location.reload()
}

/**
 * function that gets all information regarding courses, xp and webpages
 */
const getAll = () => {

    const headerEl = document.getElementById("adminHeader");
    const xpEl = document.createElement("DIV")
    const wpEl = document.createElement("DIV")
    const coursesEl = document.createElement("DIV")

    xpEl.innerHTML = ''; /*empty value*/
    fetch('https://the-amazing-world-of-shell.se/API/rest_get.php') /*make fetch*/
        .then(response => response.json())
        .then(data => {
            const courses = data[0]
            const xps = data[1]
            const wps = data[2]
            courses.forEach(course => {
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
            xps.forEach(xp => {
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
            wps.forEach(wp => {
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
    headerEl.appendChild(coursesEl)
    headerEl.appendChild(xpEl)
    headerEl.appendChild(wpEl)
}
/**
 * Function to get all webpages  from the database
 * makes fetch call ot rest_wp.php
 */
const getWp = () => {

    const headerEl = document.getElementById("adminHeader");
    const wpEl = document.createElement("DIV")
    wpEl.innerHTML = ''; /*empty value*/
    fetch('https://the-amazing-world-of-shell.se/API/rest_wp.php') /*make fetch*/
        .then(response => response.json())
        .then(data => {
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
    fetch('https://the-amazing-world-of-shell.se/API/rest_xp.php') /*make fetch*/
        .then(response => response.json())
        .then(data => {
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
    fetch('https://the-amazing-world-of-shell.se/API/rest_courses.php') /*make fetch*/
        .then(response => response.json())
        .then(data => {
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
const logout = () => {
    localStorage.setItem('loggedon', false);
    location.reload()
}
/**
 * Function to render admin form if user is authorixed
 * makes fetch call to rest_authoruzed.php
 */
const showAdmin = () => {
    const headerEl = document.getElementById("adminHeader");
    headerEl.innerHTML = "";
    getAll();
    const mainEl = document.getElementById("adminMain");
    mainEl.innerHTML = "";
    mainEl.innerHTML = '<form id="courseAdd" >' +
        '<label for="kursname">Kursnamn:</label>' +
        '<input type="text" name="kursnamn" id="kursnamn">' +
        '<label for="university">Universitet:</label>' +
        '<input type="text" name="university" id="uni">' +
        '<label for="start_date">Startdatum:</label>' +
        '<input type="date" name="start_date" id="sdate">' +
        '<label for="end_date">Slutdatum:</label>' +
        '<input type="date" name="end_date" id="edate">' +
        '</form>' + 
        '<button onclick = "addCourse()">Lägg till kurs</button>' +
        "<hr/>" +
        '<form id="xpAdd"  >' +
        '<label for="workplace">Arbetsplats:</label>' +
        '<input type="text" name="workplace" id="workplace">' +
        '<label for="title">Title:</label>' +
        '<input type="text" name="title" id="title">' +
        '<label for="start_date">Startdatum:</label>' +
        '<input type="date" name="start_date" id="sdate">' +
        '<label for="end_date">Slutdatum:</label>' +
        '<input type="date" name="end_date" id="edate">' +
        '</form>' + 
        '<button onclick = "addXp()">Lägg till erfarenhet</button>' +
        "<hr/>" +
        '<form  id="wpAdd"  >' +
        '<label for="title">Title:</label>' +
        '<input type="text" name="title" id="wpTitle">' +
        '<label for="url">Url:</label>' +
        '<input type="url" name="url" id="url">' +
        '<label for="desc">Description:</label>' +
        '<input type="text" name="desc" id="desc">' +
        
        '</form>' + 
        '<button onclick = "addWp()">Lägg till webpage</button>' +
        "<hr/>" +
        '<form  id="courseupdate"  >' +
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
        '</form>' +
        '<button onclick = "updateCourse()">Updatera</button>' +
         "<hr/>" +
        '<form  id="xpupdate"  >' +
        '<label for="workplace">Arbetsplats:</label>' +
        '<input type="text" name="workplace" id="workplace">' +
        '<label for="title">Titel:</label>' +
        '<input type="text" name="title" id="title">' +
        '<label for="workplace">Ny Arbetsplats:</label>' +
        '<input type="text" name="workplace" id="workplace">' +
        '<label for="title">Ny Titel:</label>' +
        '<input type="text" name="title" id="title">' +
        '<label for="start_date">nytt Startdatum:</label>' +
        '<input type="date" name="start_date" id="sdate">' +
        '<label for="end_date">nytt Slutdatum:</label>' +
        '<input type="date" name="end_date" id="edate">' +
        '</form>' + 
        '<button onclick = "updateXp()">Updatera</button>' +
        "<hr/>" +
        '<form  id="wpupdate"  >' +
        '<label for="title">Titel:</label>' +
        '<input type="text" name="title" id="wpTitle">' +
        '<label for="url">Url:</label>' +
        '<input type="url" name="url" id="url">' +
        '<label for="title">ny Titel:</label>' +
        '<input type="text" name="title" id="wpTitle">' +
        '<label for="url">ny Url:</label>' +
        '<input type="url" name="url" id="url">' +
        '<label for="desc">ny Description:</label>' +
        '<input type="text" name="desc" id="desc">' +
        '</form>' +
        '<button onclick = "updateWp()">updatera</button>' +
        "<hr/>" +
        '<button onclick = "reload()">ladda om sidan</button>'+
        '<button onclick = "logout()">logout</button>'

}

const adminPage = () => {
    const loggedon = localStorage.getItem('loggedon');
    if (loggedon === "true") {
        showAdmin()
    } else {
        showLogin()
    }
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
        fetch('https://the-amazing-world-of-shell.se/API/rest_login.php', {
            method: 'POST',
            body: JSON.stringify(data),
            headers: {
                "Content-type": "application/json; charset=UTF-8"
            }, keepalive: true
        }) /*make fetch*/
            .then(response => {
                if (!response.ok) {
                    showLogin();
                    localStorage.setItem('loggedon', false);
                }
                return response.json();
            })
            .then(data => {
                if (data.message === "Login ok") {
                    localStorage.setItem('loggedon', true);
                    showAdmin();
                }
            })
    }
}


//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJhZG1pbi5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJcblxuXG5cblxuLypGdW5jdGlvbiB0byBzaG93IGxvZ2luIGZvcm0qL1xuXG5cbmNvbnN0IHNob3dMb2dpbiA9ICgpID0+IHtcblxuICAgIGNvbnN0IG1haW5FbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiYWRtaW5NYWluXCIpO1xuICAgIG1haW5FbC5pbm5lckhUTUwgPSBcIlwiO1xuICAgIG1haW5FbC5pbm5lckhUTUwgPSAnPGZvcm0gaWQ9XCJhZG1pblBhc3NcIiAgb25TdWJtaXQgPSBcImxvZ2luKClcIj4nICtcbiAgICAgICAgJzxsYWJlbD4gTMO2c2VuIDogPC9sYWJlbCA+JyArXG4gICAgICAgICc8aW5wdXQgdHlwZT1cInBhc3N3b3JkXCIgcGxhY2Vob2xkZXI9XCJMw7ZzZW5cIiBuYW1lPVwicGFzc3dvcmRcIiByZXF1aXJlZD4nICtcbiAgICAgICAgJzxidXR0b24gb25jbGljayA9IFwibG9naW4oKVwiIHR5cGU9XCJidXR0b25cIj5Mb2dpbjwvYnV0dG9uPicgK1xuICAgICAgICAnPC9mb3JtPidcbn1cbi8qKlxuICogZnVuY3Rpb24gdG8gZGVsZXRlIG9uZSBzbGVjdGVkIGNvdXJzZVxuICogbWFrZXMgZmV0Y2ggY2FsbCB0byByZXN0X2NvdXJzZXMucGhwIFxuICogQHBhcmFtIHsqfSB1bmkgXG4gKiBAcGFyYW0geyp9IG5hbWUgXG4gKi9cbmNvbnN0IGRlbGV0ZUNvdXJzZSA9ICh1bmksIG5hbWUpID0+IHtcbiAgICBjb25zb2xlLmxvZyhcImRlbGV0aW5nOiBcIiArIHVuaSArIFwiIFwiICsgbmFtZSk7XG4gICAgLyptYWtlIGZldGNoIGRlbGV0ZSovXG4gICAgY29uc3QgZGF0YSA9IHtcbiAgICAgICAgdW5pdmVyc2l0eTogdW5pLFxuICAgICAgICBjb3Vyc2VfbmFtZTogbmFtZSxcbiAgICAgICAgZW1haWw6IFwiY3Jpc3RpbmEubG9mcXZpc3RAZ21haWwuY29tXCJcbiAgICB9XG4gICAgZmV0Y2goJ2h0dHBzOi8vdGhlLWFtYXppbmctd29ybGQtb2Ytc2hlbGwuc2UvQVBJL3Jlc3RfY291cnNlcy5waHAnLCB7XG4gICAgICAgIG1ldGhvZDogJ0RFTEVURScsXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KGRhdGEpLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgICBcIkNvbnRlbnQtdHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb247IGNoYXJzZXQ9VVRGLThcIlxuICAgICAgICB9XG4gICAgfSlcbiAgICAgICAgLnRoZW4ocmVzcG9uc2UgPT4ge1xuICAgICAgICB9KVxuXG4gICAgICAgIC50aGVuKGRhdGEgPT4ge1xuXG4gICAgICAgICAgICBcblxuXG4gICAgICAgIH0pLmNhdGNoKCgpID0+IHtcbiAgICAgICAgICAgIFxuICAgICAgICB9KVxuXG59XG5cbi8qKlxuICogRnVuY3Rpb24gdG8gZGVsZXRlIHhwXG4gKiBtYWtlcyBmZXRjaCBjYWxsIHRvIHJlc3RfeHAucGhwXG4gKiBAcGFyYW0geyp9IHdvcmtwbGFjZSBcbiAqIEBwYXJhbSB7Kn0gcG9zaXRpb24gXG4gKi9cbmNvbnN0IGRlbGV0ZVhwID0gKHdvcmtwbGFjZSwgcG9zaXRpb24pID0+IHtcbiAgICBjb25zb2xlLmxvZyhcImRlbGV0aW5nOiBcIiArIHdvcmtwbGFjZSArIFwiIFwiICsgcG9zaXRpb24pO1xuICAgIC8qbWFrZSBmZXRjaCBkZWxldGUqL1xuICAgIGNvbnN0IGRhdGEgPSB7XG4gICAgICAgIHdvcmtwbGFjZTogd29ya3BsYWNlLFxuICAgICAgICBwb3NpdGlvbjogcG9zaXRpb24sXG4gICAgICAgIGVtYWlsOiBcImNyaXN0aW5hLmxvZnF2aXN0QGdtYWlsLmNvbVwiXG4gICAgfVxuICAgIGZldGNoKCdodHRwczovL3RoZS1hbWF6aW5nLXdvcmxkLW9mLXNoZWxsLnNlL0FQSS9yZXN0X3hwLnBocCcsIHtcbiAgICAgICAgbWV0aG9kOiAnREVMRVRFJyxcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoZGF0YSksXG4gICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAgIFwiQ29udGVudC10eXBlXCI6IFwiYXBwbGljYXRpb24vanNvbjsgY2hhcnNldD1VVEYtOFwiXG4gICAgICAgIH1cbiAgICB9KVxuICAgICAgICAudGhlbihyZXNwb25zZSA9PiB7XG4gICAgICAgIH0pXG4gICAgICAgIC50aGVuKGRhdGEgPT4ge1xuICAgICAgICAgICAgXG4gICAgICAgIH0pLmNhdGNoKCgpID0+IHtcbiAgICAgICAgICAgIFxuICAgICAgICB9KVxuXG5cbn1cbi8qKlxuICogRnVuY3Rpb24gdG8gZGVsZXRlIHdlYnBhZ2VcbiAqIG1ha2VzIGZldGNoIGNhbGwgdG8gcmVzdF93cC5waHBcbiAqIEBwYXJhbSB7Kn0gdGl0bGUgXG4gKiBAcGFyYW0geyp9IHVybCBcbiAqL1xuY29uc3QgZGVsZXRlV3AgPSAodGl0bGUsIHVybCkgPT4ge1xuICAgIGNvbnNvbGUubG9nKFwiZGVsZXRpbmc6IFwiICsgdGl0bGUgKyBcIiBcIiArIHVybCk7XG4gICAgLyptYWtlIGZldGNoIGRlbGV0ZSovXG4gICAgY29uc3QgZGF0YSA9IHtcbiAgICAgICAgdGl0bGU6IHRpdGxlLFxuICAgICAgICB1cmw6IHVybCxcbiAgICAgICAgZW1haWw6IFwiY3Jpc3RpbmEubG9mcXZpc3RAZ21haWwuY29tXCJcbiAgICB9XG4gICAgZmV0Y2goJ2h0dHBzOi8vdGhlLWFtYXppbmctd29ybGQtb2Ytc2hlbGwuc2UvQVBJL3Jlc3Rfd3AucGhwJywge1xuICAgICAgICBtZXRob2Q6ICdERUxFVEUnLFxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeShkYXRhKSxcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICAgXCJDb250ZW50LXR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uOyBjaGFyc2V0PVVURi04XCJcbiAgICAgICAgfVxuICAgIH0pXG4gICAgICAgIC50aGVuKHJlc3BvbnNlID0+IHtcbiAgICAgICAgfSlcbiAgICAgICAgLnRoZW4oZGF0YSA9PiB7XG4gICAgICAgICAgICBcbiAgICAgICAgfSkuY2F0Y2goKCkgPT4ge1xuICAgICAgICAgICAgXG4gICAgICAgIH0pXG5cblxufVxuLyoqXG4gKiBGdW5jdGlvbiB0byB1cGRhdGUgYW4gZXhwZXJpZW5jZSBcbiAqIG1ha2VzIGZldGNoIGNhbGwgdG8gcmVzdF94cC5waHBcbiAqL1xuY29uc3QgdXBkYXRlWHAgPSAoKSA9PiB7XG5cbiAgICB2YXIgeCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwieHB1cGRhdGVcIik7XG4gICAgY29uc3QgZGF0YSA9IHtcbiAgICAgICAgd29ya3BsYWNlOiB4LmVsZW1lbnRzWzBdLnZhbHVlLFxuICAgICAgICBwb3NpdGlvbjogeC5lbGVtZW50c1sxXS52YWx1ZSxcbiAgICAgICAgbmV3X3Bvc2l0aW9uOiB4LmVsZW1lbnRzWzJdLnZhbHVlLFxuICAgICAgICBuZXdfd29ya3BsYWNlOiB4LmVsZW1lbnRzWzNdLnZhbHVlLFxuICAgICAgICBuZXdfc3RhcnRfZGF0ZTogeC5lbGVtZW50c1s0XS52YWx1ZSxcbiAgICAgICAgbmV3X2VuZF9kYXRlOiB4LmVsZW1lbnRzWzVdLnZhbHVlLFxuICAgICAgICBlbWFpbDogXCJjcmlzdGluYS5sb2ZxdmlzdEBnbWFpbC5jb21cIlxuICAgIH1cbiAgICBmZXRjaCgnaHR0cHM6Ly90aGUtYW1hemluZy13b3JsZC1vZi1zaGVsbC5zZS9BUEkvcmVzdF94cC5waHAnLCB7XG4gICAgICAgIG1ldGhvZDogXCJQVVRcIixcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoZGF0YSksXG4gICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAgIFwiQ29udGVudC10eXBlXCI6IFwiYXBwbGljYXRpb24vanNvbjsgY2hhcnNldD1VVEYtOFwiXG4gICAgICAgIH1cbiAgICB9KVxuICAgICAgICAudGhlbihyZXNwb25zZSA9PiByZXNwb25zZS5qc29uKCkpXG4gICAgICAgIC50aGVuKGRhdGEgPT4ge1xuICAgICAgICAgICAgXG4gICAgICAgIH0pLmNhdGNoKCgpID0+IHtcbiAgICAgICAgICAgIFxuICAgICAgICB9KVxuXG5cbn1cbi8qKlxuICogRnVuY3Rpb24gdG8gdXBkYXRlIGEgd2VicGFnZVxuICogbWFrZXMgZmV0Y2ggY2FsbCB0byByZXN0X3dwLnBocFxuICovXG5jb25zdCB1cGRhdGVXcCA9ICgpID0+IHtcblxuICAgIHZhciB4ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJ3cHVwZGF0ZVwiKTtcbiAgICBjb25zdCBkYXRhID0ge1xuICAgICAgICB0aXRsZTogeC5lbGVtZW50c1swXS52YWx1ZSxcbiAgICAgICAgdXJsOiB4LmVsZW1lbnRzWzFdLnZhbHVlLFxuICAgICAgICBuZXdfdGl0bGU6IHguZWxlbWVudHNbMl0udmFsdWUsXG4gICAgICAgIG5ld191cmw6IHguZWxlbWVudHNbM10udmFsdWUsXG4gICAgICAgIG5ld19kZXNjcmlwdGlvbjogeC5lbGVtZW50c1s0XS52YWx1ZSxcbiAgICAgICAgZW1haWw6IFwiY3Jpc3RpbmEubG9mcXZpc3RAZ21haWwuY29tXCJcbiAgICB9XG4gICAgZmV0Y2goJ2h0dHBzOi8vdGhlLWFtYXppbmctd29ybGQtb2Ytc2hlbGwuc2UvQVBJL3Jlc3Rfd3AucGhwJywge1xuICAgICAgICBtZXRob2Q6IFwiUFVUXCIsXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KGRhdGEpLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgICBcIkNvbnRlbnQtdHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb247IGNoYXJzZXQ9VVRGLThcIlxuICAgICAgICB9XG4gICAgfSlcbiAgICAgICAgLnRoZW4ocmVzcG9uc2UgPT4gcmVzcG9uc2UuanNvbigpKVxuICAgICAgICAudGhlbihkYXRhID0+IHtcbiAgICAgICAgICAgIC8vZ2V0Q291cnNlcygpO1xuICAgICAgICAgICAgXG4gICAgICAgIH0pLmNhdGNoKCgpID0+IHtcbiAgICAgICAgICAgIFxuICAgICAgICB9KVxuXG59XG4vKipcbiAqIGZ1bmN0aW9uIHRvIEFkZCBhbiBleHBlcmllbmNlXG4gKiBtYWtlcyBmZXRjaCBjYWxsIHRvIHJlc3RfeHAucGhwXG4gKi9cbmNvbnN0IGFkZFhwID0gKCkgPT4ge1xuXG4gICAgdmFyIHggPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInhwQWRkXCIpO1xuICAgIGNvbnN0IGRhdGEgPSB7XG4gICAgICAgIHdvcmtwbGFjZTogeC5lbGVtZW50c1swXS52YWx1ZSxcbiAgICAgICAgcG9zaXRpb246IHguZWxlbWVudHNbMV0udmFsdWUsXG4gICAgICAgIHN0YXJ0X2RhdGU6IHguZWxlbWVudHNbMl0udmFsdWUsXG4gICAgICAgIGVuZF9kYXRlOiB4LmVsZW1lbnRzWzNdLnZhbHVlLFxuICAgICAgICBlbWFpbDogXCJjcmlzdGluYS5sb2ZxdmlzdEBnbWFpbC5jb21cIlxuICAgIH1cbiAgICBmZXRjaCgnaHR0cHM6Ly90aGUtYW1hemluZy13b3JsZC1vZi1zaGVsbC5zZS9BUEkvcmVzdF94cC5waHAnLCB7XG4gICAgICAgIG1ldGhvZDogXCJQT1NUXCIsXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KGRhdGEpLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgICBcIkNvbnRlbnQtdHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb247IGNoYXJzZXQ9VVRGLThcIlxuICAgICAgICB9XG4gICAgfSlcbiAgICAgICAgLnRoZW4ocmVzcG9uc2UgPT4gcmVzcG9uc2UuanNvbigpKVxuICAgICAgICAudGhlbihkYXRhID0+IHtcbiAgICAgICAgICAgIC8vZ2V0Q291cnNlcygpO1xuICAgICAgICAgICAgXG4gICAgICAgIH0pLmNhdGNoKCgpID0+IHtcbiAgICAgICAgICAgIFxuICAgICAgICB9KVxuXG5cbn1cbi8qKlxuICogRnVuY3Rpb24gdG8gYWRkIHdlYnBhZ2VcbiAqIG1ha2VzIGZldGNoIGNhbGwgdG8gcmVzdF93cC5waHBcbiAqL1xuY29uc3QgYWRkV3AgPSAoKSA9PiB7XG5cbiAgICB2YXIgeCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwid3BBZGRcIik7XG4gICAgY29uc3QgZGF0YSA9IHtcbiAgICAgICAgdGl0bGU6IHguZWxlbWVudHNbMF0udmFsdWUsXG4gICAgICAgIHVybDogeC5lbGVtZW50c1sxXS52YWx1ZSxcbiAgICAgICAgZGVzY3JpcHRpb246IHguZWxlbWVudHNbMl0udmFsdWUsXG4gICAgICAgIGVtYWlsOiBcImNyaXN0aW5hLmxvZnF2aXN0QGdtYWlsLmNvbVwiXG4gICAgfVxuICAgIGZldGNoKCdodHRwczovL3RoZS1hbWF6aW5nLXdvcmxkLW9mLXNoZWxsLnNlL0FQSS9yZXN0X3dwLnBocCcsIHtcbiAgICAgICAgbWV0aG9kOiBcIlBPU1RcIixcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoZGF0YSksXG4gICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAgIFwiQ29udGVudC10eXBlXCI6IFwiYXBwbGljYXRpb24vanNvbjsgY2hhcnNldD1VVEYtOFwiXG4gICAgICAgIH1cbiAgICB9KVxuICAgICAgICAudGhlbihyZXNwb25zZSA9PiByZXNwb25zZS5qc29uKCkpXG4gICAgICAgIC50aGVuKGRhdGEgPT4ge1xuICAgICAgICAgICAgLy9nZXRDb3Vyc2VzKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgfSkuY2F0Y2goKCkgPT4ge1xuICAgICAgICAgICAgXG4gICAgICAgIH0pXG5cbn1cbi8qKlxuICogZnVuY3Rpb24gdG8gdXBkYXRlIGEgY291cnNlXG4gKiBtYWtlcyBmZXRjaCBjYWxsIHRvIHJlc3RfY291cnNlLnBocFxuICovXG5jb25zdCB1cGRhdGVDb3Vyc2UgPSAoKSA9PiB7XG5cbiAgICB2YXIgeCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiY291cnNldXBkYXRlXCIpO1xuICAgIGNvbnN0IGRhdGEgPSB7XG4gICAgICAgIGNvdXJzZV9uYW1lOiB4LmVsZW1lbnRzWzBdLnZhbHVlLFxuICAgICAgICB1bml2ZXJzaXR5OiB4LmVsZW1lbnRzWzFdLnZhbHVlLFxuICAgICAgICBuZXdfY291cnNlX25hbWU6IHguZWxlbWVudHNbMl0udmFsdWUsXG4gICAgICAgIG5ld191bml2ZXJzaXR5OiB4LmVsZW1lbnRzWzNdLnZhbHVlLFxuICAgICAgICBuZXdfc3RhcnRfZGF0ZTogeC5lbGVtZW50c1s0XS52YWx1ZSxcbiAgICAgICAgbmV3X2VuZF9kYXRlOiB4LmVsZW1lbnRzWzVdLnZhbHVlLFxuICAgICAgICBlbWFpbDogXCJjcmlzdGluYS5sb2ZxdmlzdEBnbWFpbC5jb21cIlxuICAgIH1cbiAgICBmZXRjaCgnaHR0cHM6Ly90aGUtYW1hemluZy13b3JsZC1vZi1zaGVsbC5zZS9BUEkvcmVzdF9jb3Vyc2VzLnBocCcsIHtcbiAgICAgICAgbWV0aG9kOiBcIlBVVFwiLFxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeShkYXRhKSxcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICAgXCJDb250ZW50LXR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uOyBjaGFyc2V0PVVURi04XCJcbiAgICAgICAgfVxuICAgIH0pXG4gICAgICAgIC50aGVuKHJlc3BvbnNlID0+IHJlc3BvbnNlLmpzb24oKSlcbiAgICAgICAgLnRoZW4oZGF0YSA9PiB7XG4gICAgICAgICAgICAvL2dldENvdXJzZXMoKTtcbiAgICAgICAgICAgIFxuICAgICAgICB9KS5jYXRjaCgoKSA9PiB7XG4gICAgICAgICAgICBcbiAgICAgICAgfSlcblxufVxuLyoqXG4gKiBmdW5jdGlvbiB0byBhZGQgY291cnNlXG4gKiBtYWtlcyBmZXRjaCBjYWxsIHRvIHJlc3RfY291cnNlcy5waHBcbiAqL1xuY29uc3QgYWRkQ291cnNlID0gKCkgPT4ge1xuXG4gICAgdmFyIHggPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImNvdXJzZUFkZFwiKTtcbiAgICBjb25zdCBkYXRhID0ge1xuICAgICAgICBjb3Vyc2VfbmFtZTogeC5lbGVtZW50c1swXS52YWx1ZSxcbiAgICAgICAgdW5pdmVyc2l0eTogeC5lbGVtZW50c1sxXS52YWx1ZSxcbiAgICAgICAgc3RhcnRfZGF0ZTogeC5lbGVtZW50c1syXS52YWx1ZSxcbiAgICAgICAgZW5kX2RhdGU6IHguZWxlbWVudHNbM10udmFsdWUsXG4gICAgICAgIGVtYWlsOiBcImNyaXN0aW5hLmxvZnF2aXN0QGdtYWlsLmNvbVwiXG4gICAgfVxuICAgZmV0Y2goJ2h0dHBzOi8vdGhlLWFtYXppbmctd29ybGQtb2Ytc2hlbGwuc2UvQVBJL3Jlc3RfY291cnNlcy5waHAnLCB7XG4gICAgICAgIG1ldGhvZDogXCJQT1NUXCIsXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KGRhdGEpLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgICBcIkNvbnRlbnQtdHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb247IGNoYXJzZXQ9VVRGLThcIlxuICAgICAgICB9XG4gICAgfSlcbiAgICAgICAgLnRoZW4ocmVzcG9uc2UgPT4gcmVzcG9uc2UuanNvbigpKVxuICAgICAgICAudGhlbihkYXRhID0+IHtcbiAgICAgICAgICAgIC8vZ2V0Q291cnNlcygpO1xuICAgICAgICAgICAgXG4gICAgICAgIH0pLmNhdGNoKCgpID0+IHtcbiAgICAgICAgICAgIFxuICAgICAgICB9KVxuXG59XG4vKipcbiAqIEZ1bmN0aW9uIHRvIHJlbG9hZCBwYWdlXG4gKi9cbmNvbnN0IHJlbG9hZCA9ICgpID0+IHtcbiAgICBsb2NhdGlvbi5yZWxvYWQoKVxufVxuXG4vKipcbiAqIGZ1bmN0aW9uIHRoYXQgZ2V0cyBhbGwgaW5mb3JtYXRpb24gcmVnYXJkaW5nIGNvdXJzZXMsIHhwIGFuZCB3ZWJwYWdlc1xuICovXG5jb25zdCBnZXRBbGwgPSAoKSA9PiB7XG5cbiAgICBjb25zdCBoZWFkZXJFbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiYWRtaW5IZWFkZXJcIik7XG4gICAgY29uc3QgeHBFbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJESVZcIilcbiAgICBjb25zdCB3cEVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcIkRJVlwiKVxuICAgIGNvbnN0IGNvdXJzZXNFbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJESVZcIilcblxuICAgIHhwRWwuaW5uZXJIVE1MID0gJyc7IC8qZW1wdHkgdmFsdWUqL1xuICAgIGZldGNoKCdodHRwczovL3RoZS1hbWF6aW5nLXdvcmxkLW9mLXNoZWxsLnNlL0FQSS9yZXN0X2dldC5waHAnKSAvKm1ha2UgZmV0Y2gqL1xuICAgICAgICAudGhlbihyZXNwb25zZSA9PiByZXNwb25zZS5qc29uKCkpXG4gICAgICAgIC50aGVuKGRhdGEgPT4ge1xuICAgICAgICAgICAgY29uc3QgY291cnNlcyA9IGRhdGFbMF1cbiAgICAgICAgICAgIGNvbnN0IHhwcyA9IGRhdGFbMV1cbiAgICAgICAgICAgIGNvbnN0IHdwcyA9IGRhdGFbMl1cbiAgICAgICAgICAgIGNvdXJzZXMuZm9yRWFjaChjb3Vyc2UgPT4ge1xuICAgICAgICAgICAgICAgIC8qKiBwYXJzZSBqc29uIGhlcmUgKi9cbiAgICAgICAgICAgICAgICBjb3Vyc2VzRWwuaW5uZXJIVE1MICs9XG4gICAgICAgICAgICAgICAgICAgIGBcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzID0gXCJjb3Vyc2VcIj5cbiAgICAgICAgICAgICAgICA8cD5cbiAgICAgICAgICAgICAgICA8Yj5LdXJzPC9iPlxuICAgICAgICAgICAgICAgIDxiPlVuaXZlcnNpdGV0OjwvYj4gJHtjb3Vyc2UudW5pdmVyc2l0eX1cbiAgICAgICAgICAgICAgICA8Yj5OYW1uOiA8L2I+ICR7Y291cnNlLmNvdXJzZV9uYW1lfVxuICAgICAgICAgICAgICAgIDxiPlN0YXJ0IGRhdHVtOiA8L2I+ICR7Y291cnNlLnN0YXJ0X2RhdGV9XG4gICAgICAgICAgICAgICAgPGI+U2x1dCBkYXR1bTogPC9iPiAke2NvdXJzZS5lbmRfZGF0ZX1cbiAgICAgICAgICAgICAgICBgKyBcIjxzcGFuIG9uQ2xpY2s9J2RlbGV0ZUNvdXJzZShcIiArICdcIicgKyBgJHtjb3Vyc2UudW5pdmVyc2l0eX1gICsgJ1wiJyArIFwiLFwiICsgJ1wiJyArIGAke2NvdXJzZS5jb3Vyc2VfbmFtZX1gICsgJ1wiJyArIFwiKSc+IFRhIGJvcnQgPC9zcGFuPlwiICtcbiAgICAgICAgICAgICAgICAgICAgXCI8L3A+PC9kaXY+XCJcblxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIHhwcy5mb3JFYWNoKHhwID0+IHtcbiAgICAgICAgICAgICAgICAvKiogcGFyc2UganNvbiBoZXJlICovXG4gICAgICAgICAgICAgICAgeHBFbC5pbm5lckhUTUwgKz1cbiAgICAgICAgICAgICAgICAgICAgYFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3MgPSBcImNvdXJzZVwiPlxuICAgICAgICAgICAgICAgIDxwPlxuICAgICAgICAgICAgICAgIDxiPkVyZmFyZW5oZXQ8L2I+XG4gICAgICAgICAgICAgICAgPGI+QXJiZXRzcGxhdHM6PC9iPiAke3hwLndvcmtfcGxhY2V9XG4gICAgICAgICAgICAgICAgPGI+UG9zaXRpb246IDwvYj4gJHt4cC5wb3NpdGlvbn1cbiAgICAgICAgICAgICAgICA8Yj5TdGFydCBkYXR1bTogPC9iPiAke3hwLnN0YXJ0X2RhdGV9XG4gICAgICAgICAgICAgICAgPGI+U2x1dCBkYXR1bTogPC9iPiAke3hwLmVuZF9kYXRlfVxuICAgICAgICAgICAgICAgIGArIFwiPHNwYW4gb25DbGljaz0nZGVsZXRlWHAoXCIgKyAnXCInICsgYCR7eHAud29ya19wbGFjZX1gICsgJ1wiJyArIFwiLFwiICsgJ1wiJyArIGAke3hwLnBvc2l0aW9ufWAgKyAnXCInICsgXCIpJz4gVGEgYm9ydCA8L3NwYW4+XCIgK1xuICAgICAgICAgICAgICAgICAgICBcIjwvcD48L2Rpdj5cIlxuXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgd3BzLmZvckVhY2god3AgPT4ge1xuICAgICAgICAgICAgICAgIC8qKiBwYXJzZSBqc29uIGhlcmUgKi9cbiAgICAgICAgICAgICAgICB3cEVsLmlubmVySFRNTCArPVxuICAgICAgICAgICAgICAgICAgICBgXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcyA9IFwiY291cnNlXCI+XG4gICAgICAgICAgICAgICAgPHA+XG4gICAgICAgICAgICAgICAgPGI+V2VicGxhdHNlcjwvYj5cbiAgICAgICAgICAgICAgICA8Yj5UaXRlbDo8L2I+ICR7d3AudGl0bGV9XG4gICAgICAgICAgICAgICAgPGI+QmVza3Jpdm5pbmc6IDwvYj4gJHt3cC5kZXNjfVxuICAgICAgICAgICAgICAgIDxiPlVSTDogPC9iPiAke3dwLnVybH1cbiAgICAgICAgICAgICAgICBgKyBcIjxzcGFuIG9uQ2xpY2s9J2RlbGV0ZVdwKFwiICsgJ1wiJyArIGAke3dwLnRpdGxlfWAgKyAnXCInICsgXCIsXCIgKyAnXCInICsgYCR7d3AudXJsfWAgKyAnXCInICsgXCIpJz4gVGEgYm9ydCA8L3NwYW4+XCIgK1xuICAgICAgICAgICAgICAgICAgICBcIjwvcD48L2Rpdj5cIlxuXG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgIGhlYWRlckVsLmFwcGVuZENoaWxkKGNvdXJzZXNFbClcbiAgICBoZWFkZXJFbC5hcHBlbmRDaGlsZCh4cEVsKVxuICAgIGhlYWRlckVsLmFwcGVuZENoaWxkKHdwRWwpXG59XG4vKipcbiAqIEZ1bmN0aW9uIHRvIGdldCBhbGwgd2VicGFnZXMgIGZyb20gdGhlIGRhdGFiYXNlXG4gKiBtYWtlcyBmZXRjaCBjYWxsIG90IHJlc3Rfd3AucGhwXG4gKi9cbmNvbnN0IGdldFdwID0gKCkgPT4ge1xuXG4gICAgY29uc3QgaGVhZGVyRWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImFkbWluSGVhZGVyXCIpO1xuICAgIGNvbnN0IHdwRWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiRElWXCIpXG4gICAgd3BFbC5pbm5lckhUTUwgPSAnJzsgLyplbXB0eSB2YWx1ZSovXG4gICAgZmV0Y2goJ2h0dHBzOi8vdGhlLWFtYXppbmctd29ybGQtb2Ytc2hlbGwuc2UvQVBJL3Jlc3Rfd3AucGhwJykgLyptYWtlIGZldGNoKi9cbiAgICAgICAgLnRoZW4ocmVzcG9uc2UgPT4gcmVzcG9uc2UuanNvbigpKVxuICAgICAgICAudGhlbihkYXRhID0+IHtcbiAgICAgICAgICAgIGlmIChkYXRhLm1lc3NhZ2UgPT09IFwiTm8gd2VicGFnZXMgZm91bmRcIikgeyAvL2NoZWNrIGlmIHRoaXMgaXMgY29ycmVjdFxuICAgICAgICAgICAgICAgIHJldHVyblxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGF0YS5mb3JFYWNoKHdwID0+IHtcbiAgICAgICAgICAgICAgICAvKiogcGFyc2UganNvbiBoZXJlICovXG4gICAgICAgICAgICAgICAgd3BFbC5pbm5lckhUTUwgKz1cbiAgICAgICAgICAgICAgICAgICAgYFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3MgPSBcImNvdXJzZVwiPlxuICAgICAgICAgICAgICAgIDxwPlxuICAgICAgICAgICAgICAgIDxiPldlYnBsYXRzZXI8L2I+XG4gICAgICAgICAgICAgICAgPGI+VGl0ZWw6PC9iPiAke3dwLnRpdGxlfVxuICAgICAgICAgICAgICAgIDxiPkJlc2tyaXZuaW5nOiA8L2I+ICR7d3AuZGVzY31cbiAgICAgICAgICAgICAgICA8Yj5VUkw6IDwvYj4gJHt3cC51cmx9XG4gICAgICAgICAgICAgICAgYCsgXCI8c3BhbiBvbkNsaWNrPSdkZWxldGVXcChcIiArICdcIicgKyBgJHt3cC50aXRsZX1gICsgJ1wiJyArIFwiLFwiICsgJ1wiJyArIGAke3dwLnVybH1gICsgJ1wiJyArIFwiKSc+IFRhIGJvcnQgPC9zcGFuPlwiICtcbiAgICAgICAgICAgICAgICAgICAgXCI8L3A+PC9kaXY+XCJcblxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICBoZWFkZXJFbC5hcHBlbmRDaGlsZCh3cEVsKVxuXG59XG5cbi8qKlxuICogZnVuY3Rpb24gdG8gZ2V0IGFsbCBleHBlcmllbmNlcyBpbiBkYXRhYmFzZVxuICogbWFrZXMgZmV0Y2ggY2FsbCB0byByZXN0X3hwLnBocFxuICovXG5jb25zdCBnZXRYcCA9ICgpID0+IHtcblxuICAgIGNvbnN0IGhlYWRlckVsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJhZG1pbkhlYWRlclwiKTtcbiAgICBjb25zdCB4cEVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcIkRJVlwiKVxuICAgIHhwRWwuaW5uZXJIVE1MID0gJyc7IC8qZW1wdHkgdmFsdWUqL1xuICAgIGZldGNoKCdodHRwczovL3RoZS1hbWF6aW5nLXdvcmxkLW9mLXNoZWxsLnNlL0FQSS9yZXN0X3hwLnBocCcpIC8qbWFrZSBmZXRjaCovXG4gICAgICAgIC50aGVuKHJlc3BvbnNlID0+IHJlc3BvbnNlLmpzb24oKSlcbiAgICAgICAgLnRoZW4oZGF0YSA9PiB7XG4gICAgICAgICAgICBpZiAoZGF0YS5tZXNzYWdlID09PSBcIk5vIGV4cGVyaWVuY2UgZm91bmRcIikgeyAvL2NoZWNrIGlmIHRoaXMgaXMgY29ycmVjdFxuICAgICAgICAgICAgICAgIHJldHVyblxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGF0YS5mb3JFYWNoKHhwID0+IHtcbiAgICAgICAgICAgICAgICAvKiogcGFyc2UganNvbiBoZXJlICovXG4gICAgICAgICAgICAgICAgeHBFbC5pbm5lckhUTUwgKz1cbiAgICAgICAgICAgICAgICAgICAgYFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3MgPSBcImNvdXJzZVwiPlxuICAgICAgICAgICAgICAgIDxwPlxuICAgICAgICAgICAgICAgIDxiPkVyZmFyZW5oZXQ8L2I+XG4gICAgICAgICAgICAgICAgPGI+QXJiZXRzcGxhdHM6PC9iPiAke3hwLndvcmtfcGxhY2V9XG4gICAgICAgICAgICAgICAgPGI+UG9zaXRpb246IDwvYj4gJHt4cC5wb3NpdGlvbn1cbiAgICAgICAgICAgICAgICA8Yj5TdGFydCBkYXR1bTogPC9iPiAke3hwLnN0YXJ0X2RhdGV9XG4gICAgICAgICAgICAgICAgPGI+U2x1dCBkYXR1bTogPC9iPiAke3hwLmVuZF9kYXRlfVxuICAgICAgICAgICAgICAgIGArIFwiPHNwYW4gb25DbGljaz0nZGVsZXRlWHAoXCIgKyAnXCInICsgYCR7eHAud29ya19wbGFjZX1gICsgJ1wiJyArIFwiLFwiICsgJ1wiJyArIGAke3hwLnBvc2l0aW9ufWAgKyAnXCInICsgXCIpJz4gVGEgYm9ydCA8L3NwYW4+XCIgK1xuICAgICAgICAgICAgICAgICAgICBcIjwvcD48L2Rpdj5cIlxuXG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgIGhlYWRlckVsLmFwcGVuZENoaWxkKHhwRWwpXG59XG5cbi8qKlxuICogZnVuY3Rpb24gdG8gZ2V0IGFsbCBjb3Vyc2VzIGZyb20gZGF0YWJhc2VcbiAqIG1ha2VzIGZldGNoIGNhbGwgdG8gcmVzdF9jb3Vyc2VzLnBocFxuICovXG5jb25zdCBnZXRDb3Vyc2VzID0gKCkgPT4ge1xuXG4gICAgY29uc3QgaGVhZGVyRWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImFkbWluSGVhZGVyXCIpO1xuICAgIGNvbnN0IGNvdXJzZXNFbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJESVZcIilcbiAgICBjb3Vyc2VzRWwuaW5uZXJIVE1MID0gJyc7IC8qZW1wdHkgdmFsdWUqL1xuICAgIGZldGNoKCdodHRwczovL3RoZS1hbWF6aW5nLXdvcmxkLW9mLXNoZWxsLnNlL0FQSS9yZXN0X2NvdXJzZXMucGhwJykgLyptYWtlIGZldGNoKi9cbiAgICAgICAgLnRoZW4ocmVzcG9uc2UgPT4gcmVzcG9uc2UuanNvbigpKVxuICAgICAgICAudGhlbihkYXRhID0+IHtcbiAgICAgICAgICAgIGlmIChkYXRhLm1lc3NhZ2UgPT09IFwiTm8gY291cnNlcyBmb3VuZFwiKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkYXRhLmZvckVhY2goY291cnNlID0+IHtcbiAgICAgICAgICAgICAgICAvKiogcGFyc2UganNvbiBoZXJlICovXG4gICAgICAgICAgICAgICAgY291cnNlc0VsLmlubmVySFRNTCArPVxuICAgICAgICAgICAgICAgICAgICBgXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcyA9IFwiY291cnNlXCI+XG4gICAgICAgICAgICAgICAgPHA+XG4gICAgICAgICAgICAgICAgPGI+S3VyczwvYj5cbiAgICAgICAgICAgICAgICA8Yj5Vbml2ZXJzaXRldDo8L2I+ICR7Y291cnNlLnVuaXZlcnNpdHl9XG4gICAgICAgICAgICAgICAgPGI+TmFtbjogPC9iPiAke2NvdXJzZS5jb3Vyc2VfbmFtZX1cbiAgICAgICAgICAgICAgICA8Yj5TdGFydCBkYXR1bTogPC9iPiAke2NvdXJzZS5zdGFydF9kYXRlfVxuICAgICAgICAgICAgICAgIDxiPlNsdXQgZGF0dW06IDwvYj4gJHtjb3Vyc2UuZW5kX2RhdGV9XG4gICAgICAgICAgICAgICAgYCsgXCI8c3BhbiBvbkNsaWNrPSdkZWxldGVDb3Vyc2UoXCIgKyAnXCInICsgYCR7Y291cnNlLnVuaXZlcnNpdHl9YCArICdcIicgKyBcIixcIiArICdcIicgKyBgJHtjb3Vyc2UuY291cnNlX25hbWV9YCArICdcIicgKyBcIiknPiBUYSBib3J0IDwvc3Bhbj5cIiArXG4gICAgICAgICAgICAgICAgICAgIFwiPC9wPjwvZGl2PlwiXG5cbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgaGVhZGVyRWwuYXBwZW5kQ2hpbGQoY291cnNlc0VsKVxuXG59XG5jb25zdCBsb2dvdXQgPSAoKSA9PiB7XG4gICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ2xvZ2dlZG9uJywgZmFsc2UpO1xuICAgIGxvY2F0aW9uLnJlbG9hZCgpXG59XG4vKipcbiAqIEZ1bmN0aW9uIHRvIHJlbmRlciBhZG1pbiBmb3JtIGlmIHVzZXIgaXMgYXV0aG9yaXhlZFxuICogbWFrZXMgZmV0Y2ggY2FsbCB0byByZXN0X2F1dGhvcnV6ZWQucGhwXG4gKi9cbmNvbnN0IHNob3dBZG1pbiA9ICgpID0+IHtcbiAgICBjb25zdCBoZWFkZXJFbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiYWRtaW5IZWFkZXJcIik7XG4gICAgaGVhZGVyRWwuaW5uZXJIVE1MID0gXCJcIjtcbiAgICBnZXRBbGwoKTtcbiAgICBjb25zdCBtYWluRWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImFkbWluTWFpblwiKTtcbiAgICBtYWluRWwuaW5uZXJIVE1MID0gXCJcIjtcbiAgICBtYWluRWwuaW5uZXJIVE1MID0gJzxmb3JtIGlkPVwiY291cnNlQWRkXCIgPicgK1xuICAgICAgICAnPGxhYmVsIGZvcj1cImt1cnNuYW1lXCI+S3Vyc25hbW46PC9sYWJlbD4nICtcbiAgICAgICAgJzxpbnB1dCB0eXBlPVwidGV4dFwiIG5hbWU9XCJrdXJzbmFtblwiIGlkPVwia3Vyc25hbW5cIj4nICtcbiAgICAgICAgJzxsYWJlbCBmb3I9XCJ1bml2ZXJzaXR5XCI+VW5pdmVyc2l0ZXQ6PC9sYWJlbD4nICtcbiAgICAgICAgJzxpbnB1dCB0eXBlPVwidGV4dFwiIG5hbWU9XCJ1bml2ZXJzaXR5XCIgaWQ9XCJ1bmlcIj4nICtcbiAgICAgICAgJzxsYWJlbCBmb3I9XCJzdGFydF9kYXRlXCI+U3RhcnRkYXR1bTo8L2xhYmVsPicgK1xuICAgICAgICAnPGlucHV0IHR5cGU9XCJkYXRlXCIgbmFtZT1cInN0YXJ0X2RhdGVcIiBpZD1cInNkYXRlXCI+JyArXG4gICAgICAgICc8bGFiZWwgZm9yPVwiZW5kX2RhdGVcIj5TbHV0ZGF0dW06PC9sYWJlbD4nICtcbiAgICAgICAgJzxpbnB1dCB0eXBlPVwiZGF0ZVwiIG5hbWU9XCJlbmRfZGF0ZVwiIGlkPVwiZWRhdGVcIj4nICtcbiAgICAgICAgJzwvZm9ybT4nICsgXG4gICAgICAgICc8YnV0dG9uIG9uY2xpY2sgPSBcImFkZENvdXJzZSgpXCI+TMOkZ2cgdGlsbCBrdXJzPC9idXR0b24+JyArXG4gICAgICAgIFwiPGhyLz5cIiArXG4gICAgICAgICc8Zm9ybSBpZD1cInhwQWRkXCIgID4nICtcbiAgICAgICAgJzxsYWJlbCBmb3I9XCJ3b3JrcGxhY2VcIj5BcmJldHNwbGF0czo8L2xhYmVsPicgK1xuICAgICAgICAnPGlucHV0IHR5cGU9XCJ0ZXh0XCIgbmFtZT1cIndvcmtwbGFjZVwiIGlkPVwid29ya3BsYWNlXCI+JyArXG4gICAgICAgICc8bGFiZWwgZm9yPVwidGl0bGVcIj5UaXRsZTo8L2xhYmVsPicgK1xuICAgICAgICAnPGlucHV0IHR5cGU9XCJ0ZXh0XCIgbmFtZT1cInRpdGxlXCIgaWQ9XCJ0aXRsZVwiPicgK1xuICAgICAgICAnPGxhYmVsIGZvcj1cInN0YXJ0X2RhdGVcIj5TdGFydGRhdHVtOjwvbGFiZWw+JyArXG4gICAgICAgICc8aW5wdXQgdHlwZT1cImRhdGVcIiBuYW1lPVwic3RhcnRfZGF0ZVwiIGlkPVwic2RhdGVcIj4nICtcbiAgICAgICAgJzxsYWJlbCBmb3I9XCJlbmRfZGF0ZVwiPlNsdXRkYXR1bTo8L2xhYmVsPicgK1xuICAgICAgICAnPGlucHV0IHR5cGU9XCJkYXRlXCIgbmFtZT1cImVuZF9kYXRlXCIgaWQ9XCJlZGF0ZVwiPicgK1xuICAgICAgICAnPC9mb3JtPicgKyBcbiAgICAgICAgJzxidXR0b24gb25jbGljayA9IFwiYWRkWHAoKVwiPkzDpGdnIHRpbGwgZXJmYXJlbmhldDwvYnV0dG9uPicgK1xuICAgICAgICBcIjxoci8+XCIgK1xuICAgICAgICAnPGZvcm0gIGlkPVwid3BBZGRcIiAgPicgK1xuICAgICAgICAnPGxhYmVsIGZvcj1cInRpdGxlXCI+VGl0bGU6PC9sYWJlbD4nICtcbiAgICAgICAgJzxpbnB1dCB0eXBlPVwidGV4dFwiIG5hbWU9XCJ0aXRsZVwiIGlkPVwid3BUaXRsZVwiPicgK1xuICAgICAgICAnPGxhYmVsIGZvcj1cInVybFwiPlVybDo8L2xhYmVsPicgK1xuICAgICAgICAnPGlucHV0IHR5cGU9XCJ1cmxcIiBuYW1lPVwidXJsXCIgaWQ9XCJ1cmxcIj4nICtcbiAgICAgICAgJzxsYWJlbCBmb3I9XCJkZXNjXCI+RGVzY3JpcHRpb246PC9sYWJlbD4nICtcbiAgICAgICAgJzxpbnB1dCB0eXBlPVwidGV4dFwiIG5hbWU9XCJkZXNjXCIgaWQ9XCJkZXNjXCI+JyArXG4gICAgICAgIFxuICAgICAgICAnPC9mb3JtPicgKyBcbiAgICAgICAgJzxidXR0b24gb25jbGljayA9IFwiYWRkV3AoKVwiPkzDpGdnIHRpbGwgd2VicGFnZTwvYnV0dG9uPicgK1xuICAgICAgICBcIjxoci8+XCIgK1xuICAgICAgICAnPGZvcm0gIGlkPVwiY291cnNldXBkYXRlXCIgID4nICtcbiAgICAgICAgJzxsYWJlbCBmb3I9XCJrdXJzbmFtZVwiPkt1cnNuYW1uOjwvbGFiZWw+JyArXG4gICAgICAgICc8aW5wdXQgdHlwZT1cInRleHRcIiBuYW1lPVwia3Vyc25hbW5cIiBpZD1cImt1cnNuYW1uXCI+JyArXG4gICAgICAgICc8bGFiZWwgZm9yPVwidW5pdmVyc2l0eVwiPlVuaXZlcnNpdGV0OjwvbGFiZWw+JyArXG4gICAgICAgICc8aW5wdXQgdHlwZT1cInRleHRcIiBuYW1lPVwidW5pdmVyc2l0eVwiIGlkPVwidW5pXCI+JyArXG4gICAgICAgICc8bGFiZWwgZm9yPVwia3Vyc25hbWVcIj5ueXR0IEt1cnNuYW1uOjwvbGFiZWw+JyArXG4gICAgICAgICc8aW5wdXQgdHlwZT1cInRleHRcIiBuYW1lPVwia3Vyc25hbW5cIiBpZD1cImt1cnNuYW1uXCI+JyArXG4gICAgICAgICc8bGFiZWwgZm9yPVwidW5pdmVyc2l0eVwiPm55dHQgVW5pdmVyc2l0ZXQ6PC9sYWJlbD4nICtcbiAgICAgICAgJzxpbnB1dCB0eXBlPVwidGV4dFwiIG5hbWU9XCJ1bml2ZXJzaXR5XCIgaWQ9XCJ1bmlcIj4nICtcbiAgICAgICAgJzxsYWJlbCBmb3I9XCJzdGFydF9kYXRlXCI+bnl0dCBTdGFydGRhdHVtOjwvbGFiZWw+JyArXG4gICAgICAgICc8aW5wdXQgdHlwZT1cImRhdGVcIiBuYW1lPVwic3RhcnRfZGF0ZVwiIGlkPVwic2RhdGVcIj4nICtcbiAgICAgICAgJzxsYWJlbCBmb3I9XCJlbmRfZGF0ZVwiPm55dHQgU2x1dGRhdHVtOjwvbGFiZWw+JyArXG4gICAgICAgICc8aW5wdXQgdHlwZT1cImRhdGVcIiBuYW1lPVwiZW5kX2RhdGVcIiBpZD1cImVkYXRlXCI+JyArXG4gICAgICAgICc8L2Zvcm0+JyArXG4gICAgICAgICc8YnV0dG9uIG9uY2xpY2sgPSBcInVwZGF0ZUNvdXJzZSgpXCI+VXBkYXRlcmE8L2J1dHRvbj4nICtcbiAgICAgICAgIFwiPGhyLz5cIiArXG4gICAgICAgICc8Zm9ybSAgaWQ9XCJ4cHVwZGF0ZVwiICA+JyArXG4gICAgICAgICc8bGFiZWwgZm9yPVwid29ya3BsYWNlXCI+QXJiZXRzcGxhdHM6PC9sYWJlbD4nICtcbiAgICAgICAgJzxpbnB1dCB0eXBlPVwidGV4dFwiIG5hbWU9XCJ3b3JrcGxhY2VcIiBpZD1cIndvcmtwbGFjZVwiPicgK1xuICAgICAgICAnPGxhYmVsIGZvcj1cInRpdGxlXCI+VGl0ZWw6PC9sYWJlbD4nICtcbiAgICAgICAgJzxpbnB1dCB0eXBlPVwidGV4dFwiIG5hbWU9XCJ0aXRsZVwiIGlkPVwidGl0bGVcIj4nICtcbiAgICAgICAgJzxsYWJlbCBmb3I9XCJ3b3JrcGxhY2VcIj5OeSBBcmJldHNwbGF0czo8L2xhYmVsPicgK1xuICAgICAgICAnPGlucHV0IHR5cGU9XCJ0ZXh0XCIgbmFtZT1cIndvcmtwbGFjZVwiIGlkPVwid29ya3BsYWNlXCI+JyArXG4gICAgICAgICc8bGFiZWwgZm9yPVwidGl0bGVcIj5OeSBUaXRlbDo8L2xhYmVsPicgK1xuICAgICAgICAnPGlucHV0IHR5cGU9XCJ0ZXh0XCIgbmFtZT1cInRpdGxlXCIgaWQ9XCJ0aXRsZVwiPicgK1xuICAgICAgICAnPGxhYmVsIGZvcj1cInN0YXJ0X2RhdGVcIj5ueXR0IFN0YXJ0ZGF0dW06PC9sYWJlbD4nICtcbiAgICAgICAgJzxpbnB1dCB0eXBlPVwiZGF0ZVwiIG5hbWU9XCJzdGFydF9kYXRlXCIgaWQ9XCJzZGF0ZVwiPicgK1xuICAgICAgICAnPGxhYmVsIGZvcj1cImVuZF9kYXRlXCI+bnl0dCBTbHV0ZGF0dW06PC9sYWJlbD4nICtcbiAgICAgICAgJzxpbnB1dCB0eXBlPVwiZGF0ZVwiIG5hbWU9XCJlbmRfZGF0ZVwiIGlkPVwiZWRhdGVcIj4nICtcbiAgICAgICAgJzwvZm9ybT4nICsgXG4gICAgICAgICc8YnV0dG9uIG9uY2xpY2sgPSBcInVwZGF0ZVhwKClcIj5VcGRhdGVyYTwvYnV0dG9uPicgK1xuICAgICAgICBcIjxoci8+XCIgK1xuICAgICAgICAnPGZvcm0gIGlkPVwid3B1cGRhdGVcIiAgPicgK1xuICAgICAgICAnPGxhYmVsIGZvcj1cInRpdGxlXCI+VGl0ZWw6PC9sYWJlbD4nICtcbiAgICAgICAgJzxpbnB1dCB0eXBlPVwidGV4dFwiIG5hbWU9XCJ0aXRsZVwiIGlkPVwid3BUaXRsZVwiPicgK1xuICAgICAgICAnPGxhYmVsIGZvcj1cInVybFwiPlVybDo8L2xhYmVsPicgK1xuICAgICAgICAnPGlucHV0IHR5cGU9XCJ1cmxcIiBuYW1lPVwidXJsXCIgaWQ9XCJ1cmxcIj4nICtcbiAgICAgICAgJzxsYWJlbCBmb3I9XCJ0aXRsZVwiPm55IFRpdGVsOjwvbGFiZWw+JyArXG4gICAgICAgICc8aW5wdXQgdHlwZT1cInRleHRcIiBuYW1lPVwidGl0bGVcIiBpZD1cIndwVGl0bGVcIj4nICtcbiAgICAgICAgJzxsYWJlbCBmb3I9XCJ1cmxcIj5ueSBVcmw6PC9sYWJlbD4nICtcbiAgICAgICAgJzxpbnB1dCB0eXBlPVwidXJsXCIgbmFtZT1cInVybFwiIGlkPVwidXJsXCI+JyArXG4gICAgICAgICc8bGFiZWwgZm9yPVwiZGVzY1wiPm55IERlc2NyaXB0aW9uOjwvbGFiZWw+JyArXG4gICAgICAgICc8aW5wdXQgdHlwZT1cInRleHRcIiBuYW1lPVwiZGVzY1wiIGlkPVwiZGVzY1wiPicgK1xuICAgICAgICAnPC9mb3JtPicgK1xuICAgICAgICAnPGJ1dHRvbiBvbmNsaWNrID0gXCJ1cGRhdGVXcCgpXCI+dXBkYXRlcmE8L2J1dHRvbj4nICtcbiAgICAgICAgXCI8aHIvPlwiICtcbiAgICAgICAgJzxidXR0b24gb25jbGljayA9IFwicmVsb2FkKClcIj5sYWRkYSBvbSBzaWRhbjwvYnV0dG9uPicrXG4gICAgICAgICc8YnV0dG9uIG9uY2xpY2sgPSBcImxvZ291dCgpXCI+bG9nb3V0PC9idXR0b24+J1xuXG59XG5cbmNvbnN0IGFkbWluUGFnZSA9ICgpID0+IHtcbiAgICBjb25zdCBsb2dnZWRvbiA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKCdsb2dnZWRvbicpO1xuICAgIGlmIChsb2dnZWRvbiA9PT0gXCJ0cnVlXCIpIHtcbiAgICAgICAgc2hvd0FkbWluKClcbiAgICB9IGVsc2Uge1xuICAgICAgICBzaG93TG9naW4oKVxuICAgIH1cbn1cbi8qKlxuICogRnVuY3Rpb24gdG8gcHJlZm9ybSBhIGxvZ2luIG9mIHVzZXJcbiAqIGNhbGxzIGZldGNoIHdpdGggdXJsIHJlc3RfbG9naW4ucGhwXG4gKi9cbmNvbnN0IGxvZ2luID0gKCkgPT4ge1xuICAgIGNvbnN0IHggPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImFkbWluUGFzc1wiKTtcbiAgICBjb25zdCBwYXNzd29yZCA9IHguZWxlbWVudHNbMF0udmFsdWVcblxuICAgIGlmIChwYXNzd29yZCkge1xuICAgICAgICBjb25zdCBkYXRhID0ge1xuICAgICAgICAgICAgZW1haWw6IFwiY3Jpc3RpbmEubG9mcXZpc3RAZ21haWwuY29tXCIsXG4gICAgICAgICAgICBwYXNzd29yZDogcGFzc3dvcmRcbiAgICAgICAgfVxuICAgICAgICBmZXRjaCgnaHR0cHM6Ly90aGUtYW1hemluZy13b3JsZC1vZi1zaGVsbC5zZS9BUEkvcmVzdF9sb2dpbi5waHAnLCB7XG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KGRhdGEpLFxuICAgICAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICAgICAgIFwiQ29udGVudC10eXBlXCI6IFwiYXBwbGljYXRpb24vanNvbjsgY2hhcnNldD1VVEYtOFwiXG4gICAgICAgICAgICB9LCBrZWVwYWxpdmU6IHRydWVcbiAgICAgICAgfSkgLyptYWtlIGZldGNoKi9cbiAgICAgICAgICAgIC50aGVuKHJlc3BvbnNlID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgICAgICAgICAgICAgICAgIHNob3dMb2dpbigpO1xuICAgICAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgnbG9nZ2Vkb24nLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5qc29uKCk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLnRoZW4oZGF0YSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGRhdGEubWVzc2FnZSA9PT0gXCJMb2dpbiBva1wiKSB7XG4gICAgICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKCdsb2dnZWRvbicsIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICBzaG93QWRtaW4oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgIH1cbn1cblxuIl0sImZpbGUiOiJhZG1pbi5qcyJ9
