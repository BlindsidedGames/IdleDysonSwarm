// Electron exports Node-API from its executable on Windows. Resolve against the
// current process so renamed Steam executables do not require node.exe/node.dll.
#ifdef _WIN32
#define WIN32_LEAN_AND_MEAN
#include <windows.h>
template <typename T> static T nodeApiSymbol(const char* name) {
  auto symbol = GetProcAddress(GetModuleHandle(nullptr), name);
  if (!symbol) throw std::runtime_error("Required Node-API symbol unavailable");
  return reinterpret_cast<T>(symbol);
}
#define napi_create_array nodeApiSymbol<decltype(&napi_create_array)>("napi_create_array")
#define napi_create_array_with_length nodeApiSymbol<decltype(&napi_create_array_with_length)>("napi_create_array_with_length")
#define napi_create_double nodeApiSymbol<decltype(&napi_create_double)>("napi_create_double")
#define napi_create_function nodeApiSymbol<decltype(&napi_create_function)>("napi_create_function")
#define napi_create_object nodeApiSymbol<decltype(&napi_create_object)>("napi_create_object")
#define napi_create_string_utf8 nodeApiSymbol<decltype(&napi_create_string_utf8)>("napi_create_string_utf8")
#define napi_get_boolean nodeApiSymbol<decltype(&napi_get_boolean)>("napi_get_boolean")
#define napi_get_cb_info nodeApiSymbol<decltype(&napi_get_cb_info)>("napi_get_cb_info")
#define napi_get_value_double nodeApiSymbol<decltype(&napi_get_value_double)>("napi_get_value_double")
#define napi_get_value_string_utf8 nodeApiSymbol<decltype(&napi_get_value_string_utf8)>("napi_get_value_string_utf8")
#define napi_set_element nodeApiSymbol<decltype(&napi_set_element)>("napi_set_element")
#define napi_set_named_property nodeApiSymbol<decltype(&napi_set_named_property)>("napi_set_named_property")
#define napi_throw_error nodeApiSymbol<decltype(&napi_throw_error)>("napi_throw_error")
#endif
