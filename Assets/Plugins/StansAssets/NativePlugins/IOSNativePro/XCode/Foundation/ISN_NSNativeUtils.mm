

extern "C" void* _ISN_GetNSMutableData(NSMutableData* rawData,  int* size)
{
     *size = (int)rawData.length;
    return [rawData mutableBytes];
}

extern "C" void _ISN_ReleaseNSMutableData(void* rawData)
{
    CFBridgingRelease(rawData);
}
