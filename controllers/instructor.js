var express = require('express');
var router = express.Router();
var mysql = require('../config/mysql');

router.get('/', function (req, res, next) {
  mysql.query("SELECT * FROM users", function (err, result) {
    if (err) console.error(err);
    else res.send(result);
  });
});

router.post('/course/grade', function(req, res, next){
  let body = req.body;
  let query = `UPDATE register SET grade=${body.grade} WHERE course_id=${body.course_id}\
  AND year=${body.year} AND semester=${body.semester} AND student_id=${body.student_id}
  AND section_id=${body.section_id}`;
  mysql.query(query, function(err, result){
    if(err) return res.send('FAIL');
    else return res.send('OK');
  });
});
router.get('/advisees',function(req,res){
  const mapStudentRegis = (students) => new Promise((resolve, reject) => {
    console.log(students);
		const promises = students.map((student) => {
			return new Promise((resolve, reject) => {
				let queryRegis = 'SELECT * FROM register R RIGHT JOIN courses C ON R.course_id = C.course_id WHERE student_id = ?';
				mysql.query(queryRegis, [student.student_id], (err, courses) => {
					if (err) return reject(err);
          student.courses = courses;
          resolve();
				});
			});
		});

		Promise.all(promises).then(() => {
			resolve();
		}).catch((err) => {
			reject(err);
		});
	});
  
  if(req.session.userType === 'instructor'){
    let userID = req.session.userID;
    const query = `SELECT * FROM students WHERE advisor_id = ${userID};`;
    mysql.query(query, function (err, students) {
      if (err) console.error(err);
      else mapStudentRegis(students).then(() => {
        res.send({ students : students });
      }).catch((err) => {
        res.send({});
      });
    });
  }
  else res.send({});
});

router.get('/course/all',function(req,res){
  const mapRegisterStudent = (section, registers) => new Promise((resolve, reject) => {
		const promises = registers.map(register => {
			return new Promise((resolve, reject) => {
				let queryStudent = 'SELECT * FROM students WHERE student_id = ?';
				mysql.query(queryStudent, [register.student_id], (err, students) => {
					if (err) return reject(err);
					delete students[0].password;
					section.students.push(students[0]);
					students[0].grade = register.grade;
					resolve();
				});
			});
		});

		Promise.all(promises).then(() => {
			resolve();
		}).catch((err) => {
			reject(err);
		});
	});

	const mapSectionRegister = (sections) => new Promise((resolve, reject) => {
		const promises = sections.map(section => {
			return new Promise((resolve, reject) => {
				section.students = [];
				let queryRegisters = 'SELECT * FROM register WHERE course_id = ? AND section_id = ? AND year = ? AND semester = ?';
				mysql.query(queryRegisters, [
					section.course_id,
					section.section_id,
					section.year,
					section.semester,
				], (err, registers) => {
					if (err) return reject(err);
					mapRegisterStudent(section, registers).then(() => {
						resolve();
					}).catch((err) => {
						reject(err)
					});
				});
			});
		});

		Promise.all(promises).then(() => {
			resolve();
		}).catch((err) => {
			reject(err);
		});
	});

	const mapCourseSection = (courses) => new Promise((resolve, reject) => {
		const promises = courses.map((course) => {
			return new Promise((resolve, reject) => {
				let querySection = 'SELECT * FROM sections WHERE course_id = ?';
				mysql.query(querySection, [course.course_id], (err, sections) => {
					if (err) return reject(err);
					course.sections = sections;
					mapSectionRegister(sections).then(() => {
						resolve();
					}).catch((err) => {
						reject(err);
					});
				});
			});
		});

		Promise.all(promises).then(() => {
			resolve();
		}).catch((err) => {
			reject(err);
		});
	});

  if(req.session.userType === 'instructor'){
    let userID = req.session.userID;
    const query = `SELECT * FROM teach WHERE _id = ${userID}`;
    mysql.query(query, function (err, courses) {
      if (err) console.error(err);
      else mapCourseSection(courses).then(() => {
        res.send({ courses: courses });
      }).catch((err) => {
        res.send({});
      });
    });
  }
  else res.send({});


});

module.exports = router;
