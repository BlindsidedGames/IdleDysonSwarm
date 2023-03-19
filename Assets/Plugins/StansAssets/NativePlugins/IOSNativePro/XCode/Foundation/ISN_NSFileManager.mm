# import "ISN_NSCommunication.h"
# import "ISN_Foundation.h"



extern "C" {
    
   
    
    char* _ISN_UbiquityIdentityToken() {
       
        id currentiCloudToken  = [[NSFileManager defaultManager] ubiquityIdentityToken];
        if(currentiCloudToken == nil) {
            return ISN_ConvertToChar(@"");
        } else {
            NSData *newTokenData = [NSKeyedArchiver archivedDataWithRootObject: currentiCloudToken];
            NSString* data = ISN_ConvertToBase64(newTokenData);
            return ISN_ConvertToChar(data);
        }
    }
    
}



