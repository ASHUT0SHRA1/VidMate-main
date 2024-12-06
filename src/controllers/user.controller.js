import {asyncHandler} from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js';
import {User} from '../models/user.model.js';
import {uploadonCloudinary} from '../utils/Cloudinary.js';
import {ApiResponse} from '../utils/ApiResponse.js'
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
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
export {registerUser,loginUser, logoutUser , refreshAccessToken}