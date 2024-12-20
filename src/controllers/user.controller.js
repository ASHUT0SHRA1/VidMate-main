import {asyncHandler} from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js';
import {User} from '../models/user.model.js';
import {uploadonCloudinary} from '../utils/Cloudinary.js';
import {ApiResponse} from '../utils/ApiResponse.js'
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { upload } from '../middlewares/multer.middleware.js';
import mongoose, { mongo } from 'mongoose';
dotenv.config()
const generateAccessAndRefereshTokens = async(userId) =>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return {accessToken, refreshToken}


    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating referesh and access token")
    }
}


const registerUser = asyncHandler( async(req, res)=>{
    // res.status(200).json({message : "Ok"})
    // get user detail from frontend
    // validation not empty
    // check if user already exist , username and email
    // check for images , check for avatar
    // upload them to cloudinary , avatar
    // create user object
    // remove password and refresh token field from response
    // check for user creation
    // return res
    const {fullname , email , username , password} = req.body ;
    
    if([fullname , email , username ,password].some((field)=> 
        field?.trim() === ""
    )){
        throw new ApiError(400 , "All fields are required");
    }

    const existedUser = await User.findOne({
        $or : [{username} , {email}]
    })

    if(existedUser){
        throw new ApiError(409 , "User Already Exist")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverLocalPath = req.files?.coverImage[0]?.path;

    if(!avatarLocalPath){
        throw new ApiError(400 , "avatar file is required ")
    }
    
    const avatar = await uploadonCloudinary(avatarLocalPath);
    const coverImage = await uploadonCloudinary(coverLocalPath);

    if(!avatar){
        throw new ApiError(400 , "Avatar file is required to get");
    }
    const user = await User.create({
        fullname : fullname , 
        avatar: avatar.url,
        email : email ,
        username : username.toLowerCase() ,
        coverImage : coverImage.url || "",
        password : password
    });
    // user.save();
    // console.log(user.save())
    const createUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if(!createUser){
        throw new ApiError(500, "Unable to create User");
    }
    return res.status(201).json(new ApiResponse(
        200 , 
        createUser , 
        "User Registered Successfully",

    ))
})



const loginUser = asyncHandler(async(req , res)=>{
    //req body se data
    //username or email
    //email and password check
    //access and refreshtoken generate
    //send cookie
    // response that login is successfull or not
    const {username , email , password} = req.body ; 
    if (!username && !email) {
        throw new ApiError(400, "username or email is required")
    }
    const user = await User.findOne({$or: [{email} , {username}]})
    console.log(User.find({email}));
    if(!user){
        throw new ApiError(404 , "user does not exist")
    }
    
    const isPasswordValid = await user.isPasswordCorrect(password);
    if(!isPasswordValid){
        throw new ApiError(401 , "Password is incorrect")
    } 
        
  
    
    
    const {accessToken , refreshToken } =  await generateAccessAndRefereshTokens(user._id)

    const loggedInuser = await User.findById(user._id).select("-password -refreshToken")
    const options = {
        httpOnly : true , 
        secure : true ,
    }
    return res.status(200).
   
    cookie("accessToken" , accessToken, options)
    .cookie("refreshToken" , refreshToken, options)
    .json(
        new ApiResponse(200, {
            user : loggedInuser , accessToken , refreshToken,

        },"User Logged in successfully")
    )
})

const logoutUser  = asyncHandler(async(req, res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1 // this removes the field from document
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"))
})
const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken?._id)
    
        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }
    
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")
            
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefereshTokens(user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200, 
                {accessToken, refreshToken: newRefreshToken},
                "Access token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }

})

const changePassword = asyncHandler( async(req , res)=>{
    const {oldPassword , newPassword} = req.body ; 
    const user = await User.findById(req.user?._id);
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
    if(!isPasswordCorrect){
        throw new ApiError("Invalid password")
    }
    user.password = newPassword ; 
    await user.save({validateBeforeSave : false});
    return res.status(200).json(
        new ApiResponse(200 ,{} , "password changes successfully")
    )

})

const getCurrentUser = asyncHandler(async(req , res)=>{
    return res.status(200).json(new ApiResponse(200 , req.user , 
        "current user fetched successfully"
    ))
})

const updateAccountDetails = asyncHandler(async(req , res)=>{
    const {fullname , email } = req.body ; 
    if(!(fullname || email)){
        throw new ApiError(400 , "All fields are required")
    }

    await User.findByIdAndUpdate(
        req.user?._id, 
        {
            $set : {
                fullname : fullname , 
                email : email 
            }
        }, {
            new : true
        }
    ).select("-password")
    return res.status(200).json(new ApiResponse(200 , user , "account details update successfully"))
})

const updateUserAvatar = asyncHandler(async(req , res)=>{
    const avatarLocalPath =req.file?.path
    if(!avatarLocalPath){
        throw new ApiError(400 , "Avatar file is missing")
    }

    const avatar = await uploadonCloudinary(avatarLocalPath)
    if(!avatar.url){
        throw new ApiError(400 , "Error while uploading on avatar")
    }
    const user = await User.findByIdAndUpdate(req.user?._id , 
        {
        $set : avatar.url
        },
        {new : true }).select("-password")
    return res.status(200).json(new ApiResponse(200 , user , "Avatar image updated successfully "))
})

const updateUserCoverImage = asyncHandler(async(req , res)=>{
    const coverImagelocalPath =req.file?.path
    if(!coverImagelocalPath){
        throw new ApiError(400 , "Avatar file is missing")
    }

    const cover = await uploadonCloudinary(coverImagelocalPath)
    if(!cover.url){
        throw new ApiError(400 , "Error while uploading on avatar")
    }
    const user = await User.findByIdAndUpdate(req.user?._id , 
        {
        $set : cover.url
        },
        {new : true }).select("-password")
    return res.status(200).json(new ApiResponse(200 , user , "Cover image updated successfully "))
})

const getUserChannelProfile = asyncHandler(async(req , res)=>{
    const {username}  = req.params

    if(!username.trim()){
        throw new ApiError(400 , "User inavlid ")
    }

    const channel =  User.aggregate([
        {$match : {
            username : username?.toLowerCase()

        },
        $lookup : {
            from :"subscriptions",
            localField :"_id",
            foreignField : "channel",
            as: "subscriber"

        },
        $lookup : {
            from :"subscriptions",
            localField :"_id",
            foreignField : "subscriber",
            as: "subscribedTo"
        },
        $addFields : {
            subscribersCount  : {
                $size : "$subscribers"
            }, 
            channelSubscribedTo : {
                $size : "$subscribedTo"
            }, 
            isSubscribed :{
                $cond : {
                    if : {$in : [req.user?._id ,  "$subscribers.subscriber"]},
                    then : true ,
                    else : false 
                }
            }
        },
        $project :{
            fullname : 1 , 
            username : 1 , 
            subscribersCount :1  , 
            channelSubscribedTo : 1 , 
            isSubscribed : 1 , 
            avatar : 1 , 
            coverImage : 1, 
            email : 1, 
        }}
    ])  
    if(!channel?.length){
        throw new ApiError(404 , "channel does not exist")
    }

    return res.status(200).json(new ApiResponse(200 , channel[0] , "User channel fetched successfully"))

})

const getWatchHistory  = asyncHandler(async(req, res)=>{
    const user = await User.aggregate([
        {
            $match : {
                _id : new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup : {
                from : "videos",
                localField : "watchHistory",
                foreignField :"_id",
                as:"watchHistory",
                pipeline : [
                    {
                        $lookup : {
                            from : "users",
                            localField :"owner",
                            foreignField : "_id",
                            as : "owner",
                            pipeline : [
                                {
                                    $project : {
                                        fullname : 1 , 
                                        username : 1 ,
                                        avatar : 1 
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields : {
                            owner :{
                                $first : "$owner"
                            }
                        }
                    }
                ]

            }
        }
    ])
    return res.status(200).json(new ApiResponse(200 , user[0].watchHistory , "Wathc history fetched successfully"))
})

export {
    registerUser,
    loginUser, 
    logoutUser , 
    refreshAccessToken ,
    getCurrentUser, 
    changePassword,  
    updateAccountDetails, 
    updateUserAvatar, 
    updateUserCoverImage , 
    getUserChannelProfile   , 
    getWatchHistory  
}