package com.blindsidedgames.idledysonswarm;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(IdleDysonNativePlugin.class);
        registerPlugin(IdleDysonAudioPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
