
import React from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
} from "react-native";

const colors = {
  background: "#0B1120",
  card: "#151E30",
  border: "#263249",
  text: "#F4F7FB",
  muted: "#91A0B7",
  green: "#35D39A",
  blue: "#65A9FF",
  orange: "#FFB454",
};

function StatCard({ label, value, detail, color }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={[styles.statValue, { color: color || colors.text }]}>
        {value}
      </Text>
      <Text style={styles.smallText}>{detail}</Text>
    </View>
  );
}

function MenuCard({ title, description, icon, onPress }) {
  return (
    <TouchableOpacity
      style={styles.menuCard}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={styles.menuIcon}>
        <Text style={styles.iconText}>{icon}</Text>
      </View>
      <View style={styles.menuContent}>
        <Text style={styles.menuTitle}>{title}</Text>
        <Text style={styles.menuDescription}>{description}</Text>
      </View>
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = React.useState("Home");
  const [botMode, setBotMode] = React.useState("Paper trading");

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>TRADEMIND ICT</Text>
            <Text style={styles.heading}>Trading dashboard</Text>
            <Text style={styles.muted}>Study your edge. Trade with discipline.</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>T</Text>
          </View>
        </View>

        <View style={styles.accountCard}>
          <Text style={styles.muted}>PAPER ACCOUNT BALANCE</Text>
          <Text style={styles.balance}>$10,000.00</Text>
          <Text style={styles.paperLabel}>
            DEMO DATA · NOT REAL MONEY
          </Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Performance overview</Text>
          <Text style={styles.muted}>This month</Text>
        </View>

        <View style={styles.statsGrid}>
          <StatCard
            label="Win rate"
            value="--"
            detail="No trades recorded"
            color={colors.green}
          />
          <StatCard
            label="Total trades"
            value="0"
            detail="Journal entries"
          />
          <StatCard
            label="Profit factor"
            value="--"
            detail="Needs trade data"
            color={colors.blue}
          />
          <StatCard
            label="Net P&L"
            value="$0.00"
            detail="Demo statistics"
            color={colors.green}
          />
        </View>

        <Text style={styles.sectionTitle}>Your workspace</Text>

        <MenuCard
          icon="＋"
          title="Record a trade"
          description="Log entry, stop-loss, target and outcome."
          onPress={() => setActiveTab("Journal")}
        />

        <MenuCard
          icon="⌁"
          title="SMC / ICT analysis"
          description="Organize FVG, liquidity and structure setups."
          onPress={() => setActiveTab("Analysis")}
        />

        <MenuCard
          icon="⚙"
          title="Trading bot"
          description="Review strategy and simulated trading controls."
          onPress={() => setActiveTab("Bot")}
        />

        <View style={styles.botCard}>
          <View style={styles.botHeader}>
            <Text style={styles.sectionTitle}>Bot control center</Text>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>SIMULATION ONLY</Text>
            </View>
          </View>

          <Text style={styles.muted}>
            No broker is connected. No real orders can be placed.
          </Text>

          <Text style={styles.modeLabel}>Selected mode</Text>
          <View style={styles.modeRow}>
            {["Paper trading", "Backtesting"].map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[
                  styles.modeButton,
                  botMode === mode && styles.modeButtonActive,
                ]}
                onPress={() => setBotMode(mode)}
              >
                <Text
                  style={[
                    styles.modeText,
                    botMode === mode && styles.modeTextActive,
                  ]}
                >
                  {mode}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.smallText}>
            Mode selection is a UI prototype. Strategy execution is not
            implemented yet.
          </Text>
        </View>

        {activeTab !== "Home" && (
          <View style={styles.noticeCard}>
            <Text style={styles.menuTitle}>{activeTab}</Text>
            <Text style={styles.muted}>
              This section is a placeholder. We will implement it in a
              later development step.
            </Text>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setActiveTab("Home")}
            >
              <Text style={styles.backButtonText}>Return to dashboard</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.footer}>
          TradeMind ICT · Educational trading tools
        </Text>
      </ScrollView>

      <View style={styles.bottomNav}>
        {["Home", "Journal", "Analysis", "Bot"].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={styles.navItem}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.navText,
                activeTab === tab && styles.navTextActive,
              ]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 28,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
    marginTop: 12,
  },
  brand: {
    color: colors.blue,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 8,
  },
  heading: {
    color: colors.text,
    fontSize: 25,
    fontWeight: "800",
    marginBottom: 6,
  },
  muted: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 19,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: colors.blue,
    fontSize: 20,
    fontWeight: "800",
  },
  accountCard: {
    padding: 22,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 20,
    marginBottom: 26,
  },
  balance: {
    color: colors.text,
    fontSize: 34,
    fontWeight: "800",
    marginTop: 10,
    marginBottom: 8,
  },
  paperLabel: {
    color: colors.orange,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 14,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 26,
  },
  statCard: {
    width: "48%",
    padding: 15,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    marginBottom: 12,
  },
  statValue: {
    fontSize: 23,
    fontWeight: "800",
    marginTop: 12,
    marginBottom: 6,
  },
  smallText: {
    color: colors.muted,
    fontSize: 10,
    lineHeight: 16,
    marginTop: 8,
  },
  menuCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    padding: 15,
    borderRadius: 16,
    marginBottom: 12,
  },
  menuIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#202F47",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  iconText: {
    color: colors.blue,
    fontSize: 23,
    fontWeight: "700",
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 5,
  },
  menuDescription: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 17,
  },
  arrow: {
    color: colors.muted,
    fontSize: 26,
    marginLeft: 8,
  },
  botCard: {
    padding: 17,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 18,
    marginTop: 10,
    marginBottom: 22,
  },
  botHeader: {
    marginBottom: 4,
  },
  statusBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#20352F",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    marginBottom: 12,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.green,
    marginRight: 7,
  },
  statusText: {
    color: colors.green,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  modeLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 18,
    marginBottom: 10,
  },
  modeRow: {
    flexDirection: "row",
    gap: 10,
  },
  modeButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  modeButtonActive: {
    borderColor: colors.blue,
    backgroundColor: "#1C304B",
  },
  modeText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "600",
  },
  modeTextActive: {
    color: colors.blue,
  },
  noticeCard: {
    padding: 17,
    backgroundColor: colors.card,
    borderRadius: 16,
    marginBottom: 20,
  },
  backButton: {
    alignSelf: "flex-start",
    backgroundColor: "#203653",
    padding: 12,
    borderRadius: 9,
    marginTop: 14,
  },
  backButtonText: {
    color: colors.blue,
    fontSize: 12,
    fontWeight: "700",
  },
  footer: {
    color: colors.muted,
    textAlign: "center",
    fontSize: 10,
    marginTop: 6,
    marginBottom: 12,
  },
  bottomNav: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 13,
    paddingBottom: 12,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 6,
  },
  navText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "600",
  },
  navTextActive: {
    color: colors.blue,
    fontWeight: "800",
  },
});
