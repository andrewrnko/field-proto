import { DataProvider } from "./data/store";
import { ThemeProvider } from "./shell/theme";
import { StatusBar } from "./shell/StatusBar";
import { NowScreen } from "./features/now/NowScreen";
import { Bar } from "./shell/Bar";
import { LensProvider } from "./shell/roles";
import { NavLayers, NavProvider } from "./ui/Nav";
import { SheetHost } from "./ui/Sheet";
import { ToastHost } from "./ui/primitives";
import "./styles/base.css";
import "./styles/components.css";

export default function App() {
  return (
    <ThemeProvider>
      <DataProvider>
        <div className="stage">
          <div className="device">
            <div className="screen">
              <ToastHost>
                <LensProvider>
                  <NavProvider>
                    <SheetHost>
                      <StatusBar />
                      <NavLayers root={<NowScreen />} />
                      <Bar label="Now" />
                    </SheetHost>
                  </NavProvider>
                </LensProvider>
              </ToastHost>
            </div>
          </div>
        </div>
      </DataProvider>
    </ThemeProvider>
  );
}
