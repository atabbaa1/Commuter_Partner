This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Commuter Partner  

This Typescript application is meant to alert the users when he/she arrives close to a marked destination.  
This web application requires location permission.  
You can access the web application at the following [`URL`](https://)    

There are a few pre-defined markers in Newnan, GA. You can add any markers with a right-click.  
You may also modify the range of error by modifying the radius of the error circle.    

__BUGS:__  
The circle can be dragged around. Please do NOT move the circle around. The underlying code will still assume the circle is positioned at the marker where it originated.  
Removal of markers still doesn't work, so the only way they can be removed is by refreshing the application.  
**This will also remove the notification alert, so be aware of that!**
