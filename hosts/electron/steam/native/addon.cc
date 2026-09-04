#include <node_api.h>
#include <steam/steam_api.h>
#include <string>
#include <vector>
#include <stdexcept>
#include "windows-node-api.h"

static bool initialized = false;
static int storedResult = 0;
static bool definitionsReady = false;
static bool overlayActive = false;
class StatsCallbacks {
 public:
  StatsCallbacks() : callback(this, &StatsCallbacks::stored), definitions(this, &StatsCallbacks::loaded), overlay(this, &StatsCallbacks::overlayChanged) {}
  void overlayChanged(GameOverlayActivated_t* value) { overlayActive = value->m_bActive != 0; }
  CCallback<StatsCallbacks, GameOverlayActivated_t> overlay;
  void loaded(SteamInventoryDefinitionUpdate_t*) { definitionsReady=true; }
  CCallback<StatsCallbacks, SteamInventoryDefinitionUpdate_t> definitions;
  void stored(UserStatsStored_t* value) { storedResult = static_cast<int>(value->m_eResult); }
  CCallback<StatsCallbacks, UserStatsStored_t> callback;
};
static StatsCallbacks* callbacks = nullptr;
static napi_value str(napi_env e, const std::string& s) { napi_value v; napi_create_string_utf8(e,s.c_str(),s.size(),&v); return v; }
static napi_value num(napi_env e, double n) { napi_value v; napi_create_double(e,n,&v); return v; }
static napi_value boolean(napi_env e, bool n) { napi_value v; napi_get_boolean(e,n,&v); return v; }
static napi_value object(napi_env e) { napi_value v; napi_create_object(e,&v); return v; }
static void set(napi_env e,napi_value o,const char* key,napi_value v) { napi_set_named_property(e,o,key,v); }
static std::string text(napi_env e,napi_value v) { size_t n=0; if(napi_get_value_string_utf8(e,v,nullptr,0,&n)!=napi_ok) throw std::runtime_error("Expected string"); std::vector<char>b(n+1); napi_get_value_string_utf8(e,v,b.data(),b.size(),&n); return std::string(b.data(),n); }
static double number(napi_env e,napi_value v) { double n; if(napi_get_value_double(e,v,&n)!=napi_ok) throw std::runtime_error("Expected number"); return n; }
static napi_value invoke(napi_env e,napi_callback_info info) {
 try {
  size_t argc=4; napi_value a[4]; void* data; napi_get_cb_info(e,info,&argc,a,nullptr,&data); std::string op(static_cast<const char*>(data));
  auto arg=[&](size_t i){if(i>=argc)throw std::runtime_error("Missing argument");return a[i];};
  if(op=="initialize") {
    if(!initialized) { SteamErrMsg error; if(SteamAPI_InitEx(&error)!=k_ESteamAPIInitResult_OK) throw std::runtime_error(error); initialized=true; callbacks=new StatsCallbacks(); }
    if(SteamUtils()->GetAppID()!=4348570) {delete callbacks;callbacks=nullptr;SteamAPI_Shutdown();initialized=false;throw std::runtime_error("Wrong Steam application");}
    return boolean(e,true);
  }
  if(!initialized) throw std::runtime_error("Steam unavailable");
  if(op=="pump") {SteamAPI_RunCallbacks(); return boolean(e,true);}
  if(op=="overlayStatus") {auto v=object(e);set(e,v,"enabled",boolean(e,SteamUtils()->IsOverlayEnabled()));set(e,v,"active",boolean(e,overlayActive));set(e,v,"needsPresent",boolean(e,SteamUtils()->BOverlayNeedsPresent()));return v;}
  if(op=="activateOverlay") {SteamFriends()->ActivateGameOverlay("Friends");return boolean(e,true);}
  if(op=="identity") return str(e,std::to_string(SteamUser()->GetSteamID().ConvertToUint64()));
  if(op=="shutdown") {delete callbacks; callbacks=nullptr; SteamAPI_Shutdown(); initialized=false;return boolean(e,true);}
  if(op=="stat") {auto key=text(e,arg(0)); if(text(e,arg(1))=="float") {float v;if(!SteamUserStats()->GetStat(key.c_str(),&v))throw std::runtime_error("Stat unavailable");return num(e,v);} int32 v;if(!SteamUserStats()->GetStat(key.c_str(),&v))throw std::runtime_error("Stat unavailable");return num(e,v);}
  if(op=="setStat") {auto key=text(e,arg(0)); auto n=number(e,arg(1)); bool ok=text(e,arg(2))=="float"?SteamUserStats()->SetStat(key.c_str(),static_cast<float>(n)):SteamUserStats()->SetStat(key.c_str(),static_cast<int32>(n));return boolean(e,ok);}
  if(op=="achievement") {bool v=false;if(!SteamUserStats()->GetAchievement(text(e,arg(0)).c_str(),&v))throw std::runtime_error("Achievement unavailable");return boolean(e,v);}
  if(op=="unlock") return boolean(e,SteamUserStats()->SetAchievement(text(e,arg(0)).c_str()));
  if(op=="storeStats") {storedResult=0;return boolean(e,SteamUserStats()->StoreStats());}
  if(op=="storedResult") return num(e,storedResult);
  if(op=="presence") {SteamFriends()->SetRichPresence("steam_display","#Status_InGame");return boolean(e,SteamFriends()->SetRichPresence("status",text(e,arg(0)).c_str()));}
  if(op=="clearPresence") {SteamFriends()->ClearRichPresence();return boolean(e,true);}
  if(op=="loadDefinitions") return boolean(e,SteamInventory()->LoadItemDefinitions());
  if(op=="definitionsReady") return boolean(e,definitionsReady);
  if(op=="definitions") {uint32 n=0;if(!SteamInventory()->GetItemDefinitionIDs(nullptr,&n))throw std::runtime_error("Definitions unavailable");std::vector<SteamItemDef_t> ids(n);if(n&&!SteamInventory()->GetItemDefinitionIDs(ids.data(),&n))throw std::runtime_error("Definitions unavailable");napi_value v;napi_create_array_with_length(e,n,&v);for(uint32 i=0;i<n;i++)napi_set_element(e,v,i,num(e,ids[i]));return v;}
  if(op=="definitionProperty") {auto id=static_cast<int32>(number(e,arg(0)));auto key=text(e,arg(1));uint32 n=0;if(!SteamInventory()->GetItemDefinitionProperty(id,key.c_str(),nullptr,&n))throw std::runtime_error("Property unavailable");std::vector<char>b(n);if(!SteamInventory()->GetItemDefinitionProperty(id,key.c_str(),b.data(),&n))throw std::runtime_error("Property unavailable");return str(e,std::string(b.data()));}
  if(op=="inventory") {SteamInventoryResult_t handle;if(!SteamInventory()->GetAllItems(&handle))throw std::runtime_error("Inventory unavailable");return num(e,handle);}
  if(op=="inventoryResult") {auto h=static_cast<int32>(number(e,arg(0)));auto status=SteamInventory()->GetResultStatus(h);auto v=object(e);set(e,v,"status",num(e,status));if(status!=k_EResultOK)return v;if(!SteamInventory()->CheckResultSteamID(h,SteamUser()->GetSteamID()))throw std::runtime_error("Inventory identity mismatch");uint32 n=0;SteamInventory()->GetResultItems(h,nullptr,&n);std::vector<SteamItemDetails_t>items(n);if(n&&!SteamInventory()->GetResultItems(h,items.data(),&n))throw std::runtime_error("Invalid inventory result");napi_value list;napi_create_array(e,&list);uint32 index=0;for(auto& item:items){if(item.m_unFlags&(k_ESteamItemRemoved|k_ESteamItemConsumed))continue;auto o=object(e);set(e,o,"itemDefId",num(e,item.m_iDefinition));set(e,o,"instanceId",str(e,std::to_string(item.m_itemId)));set(e,o,"quantity",num(e,item.m_unQuantity));napi_set_element(e,list,index++,o);}set(e,v,"items",list);return v;}
  if(op=="destroyResult") {SteamInventory()->DestroyResult(static_cast<int32>(number(e,arg(0))));return boolean(e,true);}
  if(op=="requestPrices") return str(e,std::to_string(SteamInventory()->RequestPrices()));
  if(op=="price") {uint64 current,base;if(!SteamInventory()->GetItemPrice(static_cast<int32>(number(e,arg(0))),&current,&base))throw std::runtime_error("Price unavailable");return num(e,static_cast<double>(current));}
  if(op=="startPurchase") {SteamItemDef_t id=static_cast<int32>(number(e,arg(0)));uint32 qty=1;return str(e,std::to_string(SteamInventory()->StartPurchase(&id,&qty,1)));}
  if(op=="callResult") {auto call=static_cast<SteamAPICall_t>(std::stoull(text(e,arg(0))));bool failed=false;auto v=object(e);if(!SteamUtils()->IsAPICallCompleted(call,&failed)){set(e,v,"pending",boolean(e,true));return v;}if(failed)throw std::runtime_error("Steam API call failed");if(text(e,arg(1))=="prices"){SteamInventoryRequestPricesResult_t r;if(!SteamUtils()->GetAPICallResult(call,&r,sizeof(r),r.k_iCallback,&failed)||failed)throw std::runtime_error("Prices failed");set(e,v,"result",num(e,r.m_result));set(e,v,"currency",str(e,r.m_rgchCurrency));}else{SteamInventoryStartPurchaseResult_t r;if(!SteamUtils()->GetAPICallResult(call,&r,sizeof(r),r.k_iCallback,&failed)||failed)throw std::runtime_error("Purchase failed");set(e,v,"result",num(e,r.m_result));}return v;}
  throw std::runtime_error("Unknown Steam operation");
 } catch(const std::exception& error) {napi_throw_error(e,nullptr,error.what());return nullptr;}
}
static napi_value init(napi_env e,napi_value exports){
 for(const char* name:{"initialize","pump","overlayStatus","activateOverlay","identity","shutdown","stat","setStat","achievement","unlock","storeStats","storedResult","presence","clearPresence","loadDefinitions","definitionsReady","definitions","definitionProperty","inventory","inventoryResult","destroyResult","requestPrices","price","startPurchase","callResult"}) {napi_value fn;napi_create_function(e,name,NAPI_AUTO_LENGTH,invoke,const_cast<char*>(name),&fn);set(e,exports,name,fn);}return exports;
}
NAPI_MODULE(NODE_GYP_MODULE_NAME,init)
