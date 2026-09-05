package com.blindsidedgames.idledysonswarm;

import android.app.Application;
import com.google.android.gms.games.PlayGamesSdk;

/** Register Play Games lifecycle handling before the first Activity is created. */
public final class IdleDysonApplication extends Application {
    @Override
    public void onCreate() {
        super.onCreate();
        PlayGamesSdk.initialize(this);
    }
}
