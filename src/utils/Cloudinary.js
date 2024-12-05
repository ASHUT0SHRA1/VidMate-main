import {v2 as cloudinary} from 'cloudinary';
import dotenv from "dotenv"
import fs from 'fs';
dotenv.config()

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET_KEY // Click 'View API Keys' above to copy your API secret
});

const uploadonCloudinary = async (localFilePath) => {
    try {
    console.log(process.env);
        
        if (!localFilePath) return null
        //upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })
        // file has been uploaded successfull
        //console.log("file is uploaded on cloudinary ", response.url);
        fs.unlinkSync(localFilePath)
        return response;

    } catch (error) {
        console.log("Unable to upload file");
        
        console.log('====================================');
        console.log(error);
        console.log('====================================');
        fs.unlinkSync(localFilePath) // remove the locally saved temporary file as the upload operation got failed
        return null;
    }
    
}
export {uploadonCloudinary}