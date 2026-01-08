#if !TARGET_OS_TV

#import "ISN_CNCommunication.h"


@implementation ISN_CNPhoneNumber
-(id) init { return self = [super init]; }
-(id) initWithCNLabeledValue:(CNLabeledValue *) phone {
    self = [super init];
    if(self) {
        self.m_CountryCode =[phone.value valueForKey:@"countryCode"];
        self.m_Digits =[phone.value valueForKey:@"digits"];
    }
    return self;
}
@end



@implementation ISN_CNContact
-(id) init { return self = [super init]; }

- (id)initWithContact:(CNContact *)contact noteRequested:(bool)noteRequested {
    self = [super init];
    if(self) {
        self.m_GivenName = contact.givenName == NULL ? @"" : contact.givenName;
        self.m_FamilyName = contact.familyName       == NULL ? @"" : contact.familyName;
        self.m_Nickname = contact.nickname       == NULL ? @"" : contact.nickname;
        self.m_OrganizationName = contact.organizationName       == NULL ? @"" : contact.organizationName;
        self.m_DepartmentName = contact.departmentName       == NULL ? @"" : contact.departmentName;
        self.m_JobTitle = contact.jobTitle       == NULL ? @"" : contact.jobTitle;
        self.m_Note = !noteRequested || contact.note == NULL ? @"" : contact.note;
       


        NSMutableArray* emails = [[NSMutableArray alloc] init];
        for (CNLabeledValue* mail in  contact.emailAddresses) {
            [emails addObject:mail.value];
        }
        self.m_Emails = emails;

        NSMutableArray<ISN_CNPhoneNumber>* phones = [[NSMutableArray<ISN_CNPhoneNumber> alloc] init];
        for (CNLabeledValue* phone in  contact.phoneNumbers) {

            ISN_CNPhoneNumber* phoneNumber = [[ISN_CNPhoneNumber alloc] initWithCNLabeledValue:phone];
            [phones addObject:phoneNumber];
        }
        self.m_Phones = phones;



    }
    return self;
}
@end


@implementation ISN_CNContactsResult
-(id) init {
    self = [super init];
    if(self) {
        self.m_Contacts = [[NSMutableArray<ISN_CNContact> alloc] init];
    }

    return self;
}
-(void) addContact:(ISN_CNContact*) contact {
    [self.m_Contacts addObject:contact];
}
@end

#endif
