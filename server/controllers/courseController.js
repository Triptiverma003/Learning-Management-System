import Course from '../models/Course.js'

//Get All courses

export const getAllCourse = async(req , res)=>{
    try{
        const courses = await Course.find({isPublished: true }).select
        (['-courseContent' , '-enrolledStudents']).populate({path: 'educator'})

        res.json({success: true , courses})
    }
    catch(error){   
        res.json({ success: false , message: error.message})
    }
}

//Get Course By Id
export const getCourseId = async (req , res)=>{
    const {id} = req.params
    try {
        const courseData = await Course.findById(id).populate({path: 'educator'})

        //Remove LectureUrl
        courseData.courseContent.forEach(chapter =>{
            chapter.chapterContent.forEach(lecture => {
                if(!lecture.isPreviewFree){
                    lecture.lectureUrl = "";
                }
            }
            )
        })

        res.json({success: true , courseData})
    } catch (error) {
        res.json({success: false, message: error.message})
    }
}


