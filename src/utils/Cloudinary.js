import {v2 as cloudinary} from 'cloudinary';
import fs from 'fs';

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET_KEY // Click 'View API Keys' above to copy your API secret
});

const uploadonCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath) return null 
        //upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath ,  {
            resource_type : "auto"          

        })
        console.log("File is uploaded on cloudinary")
        console.log('====================================');
        console.log(response.url);
        console.log('====================================');
        return response; 
    } catch (error) {
        fs.unlinkSync(localFilePath) // remove the locally saved tempoeary file as the upload operation got failed 
        return null ;
    }
    
}