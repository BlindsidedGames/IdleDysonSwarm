package com.blindsidedgames.idledysonswarm;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.google.android.gms.games.PlayGamesSdk;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        PlayGamesSdk.initialize(getApplication());
        registerPlugin(IdleDysonNativePlugin.class);
        registerPlugin(IdleDysonAudioPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
