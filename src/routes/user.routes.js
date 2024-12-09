import { Router } from 'express'
import {
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
from '../controllers/user.controller.js'
import {upload} from "../middlewares/multer.middleware.js"
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router() ; 

router.route("/register").post(upload.fields([
    {
        name : "avatar",
        maxCount : 1, 
    },
    {
        name : "coverImage",
        maxCount : 1
    }
]) ,registerUser)   

router.route("/login" ).post(loginUser);
router.route("/refresh-token").post(refreshAccessToken)
router.route("/change-password").post(verifyJWT  , changePassword);
router.route("/current-user").get(verifyJWT , getCurrentUser);
router.route("/update-account").patch(verifyJWT , updateAccountDetails);
router.route("/change-avatar").patch(verifyJWT ,upload.single("avatar"),  updateUserAvatar);
router.route("/change-coverImage").patch(verifyJWT , upload.single("coverImage") , updateUserCoverImage);
router.route("/c/:username").get(verifyJWT , getUserChannelProfile);
router.route("/history").get(verifyJWT , getWatchHistory);
//secure route

router.route("/logout").post(verifyJWT ,logoutUser)


export default router; 