import React from 'react'
import { Routes, Route , useMatch } from 'react-router-dom'
import Home from './Pages/students/Home'
import CourseList from './Pages/students/CourseList'
import CourseDetails from './Pages/students/CourseDetails'
import MyEnrollment from './Pages/students/MyEnrollment'
import Player from './Pages/students/Player'
import Loading from './components/student/Loading'
import Educator from './Pages/educator/Educator'
import AddCourse from './Pages/educator/AddCourse'
import MyCourses from './Pages/educator/MyCourses'
import StudentEnrolled from './Pages/educator/StudentsEnrolled'
import DashBoard from './Pages/educator/DashBoard'
import Navbar from './components/student/Navbar'
import "quill/dist/quill.snow.css";

const App = () => {
  const isEducatorRoute = useMatch('/educator/*');
  return (
    //yh navbar har jagah  show hoga to not show this in educator we will add something different
    <div className = 'text-default min-h-screen bg-white'>
       {!isEducatorRoute && <Navbar />}
      <Routes>
        <Route path = '/' element = {<Home/>}/>
        <Route path = '/course-list' element = {<CourseList/>}/>
        <Route path = '/course-list/:input' element = {<CourseList/>}/>
        <Route path = '/course/:id' element = {<CourseDetails/>}/>
        <Route path = '/my-enrollment' element = {<MyEnrollment/>}/>
        <Route path = '/player/:courseId' element = {<Player/>}/>
        <Route path = '/loading/:path' element = {<Loading/>}/>
        <Route path ='/educator' element = {<Educator/>}>
          <Route path = '/educator' element = {<DashBoard/>}/>
          <Route path = 'add-course' element = {<AddCourse/>}/>
          <Route path = 'my-courses' element = {<MyCourses/>}/> 
          <Route path = 'student-enrolled' element = {<StudentEnrolled/>}/>
        </Route>
      </Routes>
    </div>
  )
}

export default App
