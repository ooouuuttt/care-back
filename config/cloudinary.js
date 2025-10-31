import { v2 as cloudinary } from 'cloudinary'

const connectCloudinary = async () => {


    cloudinary.config({
        cloud_name: 'dy4tjyxir',
        api_key: '488657676117512',
        api_secret: 'Qm6qZI1-1u5V8MRx46ltw0FZDwk'
    })
}

export default connectCloudinary