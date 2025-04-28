import { createContext, useEffect , useState} from "react";
import { dummyCourses } from "../assets/assets";
import { useNavigate } from "react-router-dom";
import humanizeDuration from "humanize-duration";
import {useAuth , useUser} from '@clerk/clerk-react'
export const AppContext = createContext();
export const AppContextProvider = (props)=>{
    const currency = import.meta.env.VITE_CURRENCY
    const navigate = useNavigate()

    const {getToken} = useAuth()
    const {user} = useUser()

    const [allCourses , setAllCourses] = useState([])
    const [isEducator , setIsEducator] = useState(true)
    const[enrolledCourse , setEnrolledCourse] = useState([])
    //Fetch all courses from the server
    const fetchAllCourses = async()=>{
        setAllCourses(dummyCourses)
    }

    //function to calculate average rating
    const CalculateRating  = (course) =>{
        if(course.courseRatings.length=== 0) {
            return 0
        }
        let totalRating = 0
        course.courseRatings.forEach(rating =>{
            totalRating+=rating.rating
        })
        return totalRating/course.courseRatings.length;
    }
    //function to calculate course chapter time
    const CalculateChapterTime = (chapter)=>{
        let time = 0
        chapter.chapterContent.map((lecture)=> time+= lecture.lectureDuration)
        return humanizeDuration(time*60*1000 , {units: ["h" , "m"]})
    }
    //function to calculate course time
    const CalculateCourseDuration = (course)=>{
        let time = 0
        course.courseContent.map((chapter) => chapter.chapterContent.map(
            (lecture)=>time+=lecture.lectureDuration
        ))
        return humanizeDuration(time*60*1000 , {units: ["h" , "m"]})
    }

    //function to calculate no. of lectures  in the course 
    const CalculateNoOfLectures = (course) => {
        let totalLectures = 0;
        course.courseContent.forEach(chapter =>{
            if(Array.isArray(chapter.chapterContent)){
                totalLectures += chapter.chapterContent.length
            }
        });
        return totalLectures;
    }

    //Fetch user enrolled courses

    const FetchUserEnrolledCourses = async ()=>{
        setEnrolledCourse(dummyCourses)
    }

    useEffect(()=>{
        fetchAllCourses()
        FetchUserEnrolledCourses()
    },[])

        const logToken = async() => {
            console.log(await getToken())
        }
    useEffect(() => {
        if(user){
            logToken()
        }
    } , [user])

    const value = {
        currency , allCourses , navigate , CalculateRating , isEducator , CalculateNoOfLectures ,
        CalculateCourseDuration , CalculateChapterTime , enrolledCourse , FetchUserEnrolledCourses
    }
    return (
        <AppContext.Provider value = {value}>
            {props.children}
        </AppContext.Provider>
    )
}
